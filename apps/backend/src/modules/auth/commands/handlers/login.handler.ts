import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { Inject, UnauthorizedException } from '@nestjs/common'
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
import { PasswordIdentityRepository } from '../../repositories/password-identity.repository';
import { UserRepository } from "../../../user/repositories/user.repository"

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  public constructor(
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(ACCESS_TOKEN_JWT) private readonly accessToken: Jwt,
    @Inject(REFRESH_TOKEN_SERVICE) private readonly refreshTokenService: RefreshTokenService,
    private readonly passwordIdentityRepository: PasswordIdentityRepository,
    private readonly userRepository: UserRepository,
  ) {}

  public async execute(command: LoginCommand): Promise<TokensDto> {
    const passwordIdentity = await this.passwordIdentityRepository.findByEmail(command.dto.email)

    if (!passwordIdentity || !(await this.passwordHasher.compare(command.dto.password, passwordIdentity.passwordHash || ''))) {
      throw new UnauthorizedException(
        plainToInstance(CommonResponseDto, {
          message: 'Email or password is incorrect.',
        }),
      )
    }

    const user = passwordIdentity.user
    const accessToken = await this.accessToken.sign(user.id)
    const refreshToken = await this.refreshTokenService.create(user, command.userAgent, command.ipAddress)

    // Audit the last sign-in time
    passwordIdentity.updateLastSignInAt()
    await this.passwordIdentityRepository.update(passwordIdentity.id, passwordIdentity)
    user.updateLastSignInAt()
    await this.userRepository.update(user.id, user)

    const tokens = new TokensDto()
    tokens.accessToken = accessToken
    tokens.refreshToken = refreshToken.token

    return tokens
  }
}
