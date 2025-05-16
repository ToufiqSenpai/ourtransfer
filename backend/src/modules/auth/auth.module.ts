import { Module } from '@nestjs/common'
import { AuthController } from './presentation/controllers/auth.controller'
import { SignupHandler } from './application/commands/handlers/signup.handler'
import { CreatePasswordAuthHandler } from './application/commands/handlers/create-password-auth.handler'
import { PASSWORD_AUTH_REPOSITORY } from './domain/repositories/password-auth.repository'
import { PasswordAuthRepositoryImpl } from './infrastructure/repositories/password-auth.repository.impl'
import { AuthProfile } from './application/profiles/auth.profile'

@Module({
  controllers: [AuthController],
  providers: [
    // Handlers
    SignupHandler,
    CreatePasswordAuthHandler,

    // Repositories
    {
      provide: PASSWORD_AUTH_REPOSITORY,
      useClass: PasswordAuthRepositoryImpl,
    },

    // Profiles
    AuthProfile,
  ],
})
export class AuthModule {}
