import { forwardRef, Module } from '@nestjs/common'
import { UserModule } from '../user/user.module';
import { AuthController } from './controllers/auth.controller'
import { SignupHandler } from './commands/handlers/signup.handler'
import { LoginHandler } from './commands/handlers/login.handler';
import { AuthMapper } from './mappers/auth.mapper';
import { SendLoginVerificationCodeHandler } from './commands/handlers/send-login-verification-code.handler';
import { LoginVerificationCodeService } from './services/login-verification-code.service';
import { LoginVerificationCodeRepository } from './repositories/login-verification-code.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { RefreshTokenService } from './services/refresh-token.service';
import { TwoFactorAuthenticationService } from './services/two-factor-authentication.service';
import { GoogleOAuth2Service } from './services/google-oauth2.service';
import { GetGoogleAuthUrlHandler } from './queries/handlers/get-google-auth-url.handler';
import { MicrosoftOAuth2Service } from './services/microsoft-oauth2.service';
import { GetRefreshTokenHandler } from "./commands/handlers/get-refresh-token.handler"

@Module({
  imports: [forwardRef(() => UserModule)],
  controllers: [AuthController],
  providers: [
    // Handlers
    SignupHandler,
    LoginHandler,
    SendLoginVerificationCodeHandler,
    GetGoogleAuthUrlHandler,
    GetRefreshTokenHandler,

    // Repositories
    LoginVerificationCodeRepository,
    RefreshTokenRepository,

    // Mappers
    AuthMapper,

    // Services
    GoogleOAuth2Service,
    MicrosoftOAuth2Service,
    LoginVerificationCodeService,
    RefreshTokenService,
    TwoFactorAuthenticationService,
  ],
})
export class AuthModule {}
