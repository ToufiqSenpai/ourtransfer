import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
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
import { Logger, LOGGER } from "../../../../infrastructure/logger/logger.interface"
import { UNIT_OF_WORK, UnitOfWork } from '../../../../infrastructure/database/unit-of-work/unit-of-work.interface'
import { PASSWORD_IDENTITY_REPOSITORY, PasswordIdentityRepository } from '../../repositories/password-identity.repository'

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  public constructor(
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(ACCESS_TOKEN_JWT) private readonly accessToken: Jwt,
    @Inject(REFRESH_TOKEN_SERVICE) private readonly refreshTokenService: RefreshTokenService,
    @Inject(LOGGER) private readonly logger: Logger,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_IDENTITY_REPOSITORY) private readonly passwordIdentityRepository: PasswordIdentityRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork
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
    if (!user.identities || user.identities.length === 0) {
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

    // Update last sign in timestamps in transaction
    try {
      await this.unitOfWork.transaction(async () => {
        user.updateLastSignInAt()
        await this.userRepository.update(user.id, user)

        passwordIdentity.updateLastSignInAt()
        await this.passwordIdentityRepository.update(passwordIdentity.id, passwordIdentity)
      })
    } catch (updateError) {
      // Log the error but don't fail the login since tokens are already generated
      this.logger.error('Failed to update last sign in timestamps', updateError)
    }

    const tokens = new TokensDto()
    tokens.accessToken = accessToken
    tokens.refreshToken = refreshToken.token

    return tokens
  }
}
