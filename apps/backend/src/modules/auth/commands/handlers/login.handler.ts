import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs'
import { Inject, UnauthorizedException } from "@nestjs/common"
import { LoginCommand } from '../login.command'
import { TokensDto } from '@ourtransfer/dto'
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from '../../../../infrastructure/security/hash/password-hasher.interface'
import { ACCESS_TOKEN_JWT, AccessTokenJwt } from '../../../../infrastructure/security/jwt/access-token-jwt.interface'
import { RefreshTokenService } from '../../services/refresh-token.service'
import { UserRepository } from '../../../user/repositories/user.repository';
import { LoginVerificationCodeService } from '../../services/login-verification-code.service'
import { TwoFactorAuthenticationService } from '../../services/two-factor-authentication.service'
import { UserLoggedInEvent } from '../../events/user-logged-in.event'
import { AuthProvider, AuthenticationStatus } from '@ourtransfer/common'

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  public constructor(
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(ACCESS_TOKEN_JWT) private readonly accessToken: AccessTokenJwt,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly loginVerificationCodeService: LoginVerificationCodeService,
    private readonly twoFactorAuthenticationService: TwoFactorAuthenticationService,
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus
  ) {}

  public async execute(command: LoginCommand): Promise<TokensDto> {
    const loginDto = command.dto
    const user = await this.userRepository.findByEmail(loginDto.email)

    if (!user) {
      throw new UnauthorizedException({
        status: AuthenticationStatus.USER_NOT_FOUND,
        message: 'Invalid credentials',
      })
    }

    if (!user.password) {
      if (loginDto.verificationCode) {
        const isValid = await this.loginVerificationCodeService.verifyCode(user, loginDto.verificationCode)

        if (!isValid) {
          throw new UnauthorizedException({
            status: AuthenticationStatus.INVALID_VERIFICATION_CODE,
            message: 'Invalid verification code',
          })
        }
      } else {
        throw new UnauthorizedException({
          status: AuthenticationStatus.INVALID_VERIFICATION_CODE,
          message: 'Verification code is required for login',
        })
      }
    }

    if (user.password) {
      const isValid = await this.passwordHasher.compare(loginDto.password!, user.password);

      if (!isValid) {
        throw new UnauthorizedException({
          status: AuthenticationStatus.INVALID_CREDENTIALS,
          message: 'Invalid email or password',
        });
      }
    }

    if (user.twoFactorAuthentication) {
      if (!loginDto.twoFactorCode) {
        throw new UnauthorizedException({
          status: AuthenticationStatus.INVALID_2FA_CODE,
          message: 'Two-factor authentication code is required',
        });
      }

      const isValid2FA = await this.twoFactorAuthenticationService.verifyCode(user.email, loginDto.twoFactorCode);

      if (!isValid2FA) {
        throw new UnauthorizedException({
          status: AuthenticationStatus.INVALID_2FA_CODE,
          message: 'Invalid two-factor authentication code',
        });
      }
    }

    const refreshToken = await this.refreshTokenService.create(user, command.userAgent, command.ipAddress)
    const tokens = new TokensDto()
    tokens.refreshToken = refreshToken.token
    tokens.accessToken = await this.accessToken.sign(user.id)

    this.eventBus.publish(new UserLoggedInEvent(user, AuthProvider.EMAIL_PASSWORD))

    return tokens
  }
}
