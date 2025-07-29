import { Module } from '@nestjs/common'
import { UserModule } from '../user/user.module';
import { AuthController } from './presentation/controllers/auth.controller'
import { SignupHandler } from './application/commands/handlers/signup.handler'
import { PASSWORD_IDENTITY_REPOSITORY } from './domain/repositories/password-identity.repository'
import { PasswordIdentityRepositoryImpl } from "./infrastructure/repositories/password-identity.repository.impl"
import { AuthMapper } from './application/mappers/auth.mapper'
// import { REFRESH_TOKEN_REPOSITORY } from './domain/repositories/refresh-token.repository'
// import { RefreshTokenRepositoryImpl } from './infrastructure/repositories/refresh-token.repository.impl'
// import { REFRESH_TOKEN_SERVICE } from './application/interfaces/services/refresh-token.service'
// import { RefreshTokenServiceImpl } from './infrastructure/services/refresh-token.service.impl'
// import { LoginHandler } from './application/commands/handlers/login.handler'
// import { RefreshHandler } from './application/commands/handlers/refresh.handler'

@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [
    // Handlers
    SignupHandler,
    // LoginHandler,
    // RefreshHandler,

    // Repositories
    {
      provide: PASSWORD_IDENTITY_REPOSITORY,
      useClass: PasswordIdentityRepositoryImpl,
    },
    // {
    //   provide: REFRESH_TOKEN_REPOSITORY,
    //   useClass: RefreshTokenRepositoryImpl,
    // },

    // Mappers
    AuthMapper,

    // Services
    // {
    //   provide: REFRESH_TOKEN_SERVICE,
    //   useClass: RefreshTokenServiceImpl,
    // },
  ],
})
export class AuthModule {}
