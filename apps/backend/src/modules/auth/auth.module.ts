import { Module } from '@nestjs/common'
import { UserModule } from '../user/user.module';
import { AuthController } from './controllers/auth.controller'
import { SignupHandler } from './commands/handlers/signup.handler'
import { PasswordIdentityRepository } from "./repositories/password-identity.repository"

@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [
    // Handlers
    SignupHandler,

    // Repositories
    PasswordIdentityRepository,

    // Mappers
  ],
})
export class AuthModule {}
