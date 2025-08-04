import { forwardRef, Module } from '@nestjs/common'
import { UserModule } from '../user/user.module';
import { AuthController } from './controllers/auth.controller'
import { SignupHandler } from './commands/handlers/signup.handler'
import { PASSWORD_IDENTITY_REPOSITORY } from "./repositories/password-identity.repository"
import { REFRESH_TOKEN_REPOSITORY } from "./repositories/refresh-token.repository"
import { REFRESH_TOKEN_SERVICE } from './services/refresh-token.service';
import { RefreshTokenServiceImpl } from './services/refresh-token.service.impl';
import { PasswordIdentityRepositoryImpl } from "./repositories/password-identity.repository.impl"
import { RefreshTokenRepositoryImpl } from "./repositories/refresh-token.repository.impl"
import { LoginHandler } from './commands/handlers/login.handler';
import { AuthMapper } from './mappers/auth.mapper';
import { IDENTITY_REPOSITORY } from "./repositories/identity.repository"
import { IdentityRepositoryImpl } from "./repositories/identity.repository.impl"
import { IDENTITY_SERVICE } from "./services/identity.service"
import { IdentityServiceImpl } from './services/identity.service.impl';
import { GetProvidersHandler } from './queries/handlers/get-providers.handler';

@Module({
  imports: [forwardRef(() => UserModule)],
  controllers: [AuthController],
  providers: [
    // Handlers
    SignupHandler,
    LoginHandler,
    GetProvidersHandler,

    // Repositories
    {
      provide: IDENTITY_REPOSITORY,
      useClass: IdentityRepositoryImpl,
    },
    {
      provide: PASSWORD_IDENTITY_REPOSITORY,
      useClass: PasswordIdentityRepositoryImpl,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: RefreshTokenRepositoryImpl
    },

    // Mappers
    AuthMapper,

    // Services
    {
      provide: IDENTITY_SERVICE,
      useClass: IdentityServiceImpl,
    },
    {
      provide: REFRESH_TOKEN_SERVICE,
      useClass: RefreshTokenServiceImpl
    }
  ],
})
export class AuthModule {}
