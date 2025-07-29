import { Module } from '@nestjs/common'
import { UserModule } from '../user/user.module';
import { AuthController } from './controllers/auth.controller'
import { SignupHandler } from './commands/handlers/signup.handler'
import { PasswordIdentityRepository } from "./repositories/password-identity.repository"
import { RefreshTokenRepository } from "./repositories/refresh-token.repository"
import { REFRESH_TOKEN_SERVICE } from './services/refresh-token.service';
import { RefreshTokenServiceImpl } from './services/refresh-token.service.impl';

@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [
    // Handlers
    SignupHandler,

    // Repositories
    PasswordIdentityRepository,
    RefreshTokenRepository,

    // Mappers

    // Services
    {
      provide: REFRESH_TOKEN_SERVICE,
      useClass: RefreshTokenServiceImpl
    }
  ],
})
export class AuthModule {}
