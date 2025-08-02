import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs'
import { ForbiddenException, Inject, UnauthorizedException } from "@nestjs/common"
import { LoginCommand } from '../login.command'
import { TokensDto, CommonResponseDto } from '@ourtransfer/dto'
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from '../../../../infrastructure/security/hash/password-hasher.interface'
import { plainToInstance } from 'class-transformer'
import { ACCESS_TOKEN_JWT } from '../../../../infrastructure/security/jwt/access-token-jwt.interface'
import { Jwt } from '../../../../infrastructure/security/jwt/jwt.interface'
import { REFRESH_TOKEN_SERVICE, RefreshTokenService } from '../../services/refresh-token.service'
import { USER_REPOSITORY, UserRepository } from '../../../user/repositories/user.repository';
import { PasswordIdentity } from "../../entities/password-identity.entity"
import { AuthProvider } from '@ourtransfer/common'
import { UserLoggedInEvent } from '../../events/user-logged-in.event'

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  public constructor(
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(ACCESS_TOKEN_JWT) private readonly accessToken: Jwt,
    @Inject(REFRESH_TOKEN_SERVICE) private readonly refreshTokenService: RefreshTokenService,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus
  ) {}

  public async execute(command: LoginCommand): Promise<TokensDto> {
    // Get user with password identity
    const user = await this.userRepository.findByEmail(command.dto.email)

    if (!user) {
      throw new UnauthorizedException(plainToInstance(CommonResponseDto, {
        message: 'Email or password is incorrect.',
      }))
    }

    // Check for identities existence
    if (!user.identities || user.identities.some(identity => identity.authProvider === AuthProvider.EMAIL_PASSWORD)) {
      throw new ForbiddenException(plainToInstance(CommonResponseDto, {
        message: "Unsupported authentication method. Please use a different login method."
      }))
    }

    // Find password identity safely
    const passwordIdentity = user.identities.find(identity => identity instanceof PasswordIdentity)
    if (!passwordIdentity || !(passwordIdentity instanceof PasswordIdentity)) {
      throw new UnauthorizedException(plainToInstance(CommonResponseDto, {
        message: 'Email or password is incorrect.',
      }))
    }

    // Ensure password hash exists
    if (!passwordIdentity.passwordHash || !passwordIdentity.passwordHash.trim()) {
      throw new UnauthorizedException(plainToInstance(CommonResponseDto, {
        message: 'Email or password is incorrect.',
      }))
    }

    // Verify password
    const isPasswordValid = await this.passwordHasher.compare(command.dto.password, passwordIdentity.passwordHash)
    if (!isPasswordValid) {
      throw new UnauthorizedException(plainToInstance(CommonResponseDto, {
        message: 'Email or password is incorrect.',
      }))
    }

    // Generate tokens
    const accessToken = await this.accessToken.sign(user.id)
    const refreshToken = await this.refreshTokenService.create(user, command.userAgent, command.ipAddress)

    this.eventBus.publish(new UserLoggedInEvent(user, passwordIdentity))

    const tokens = new TokensDto()
    tokens.accessToken = accessToken
    tokens.refreshToken = refreshToken.token

    return tokens
  }
}
