import { forwardRef, Module } from '@nestjs/common'
import { UserController } from './controllers/user.controller'
import { UserMapper } from './mappers/user.mapper'
import { AuthModule } from '../auth/auth.module'
import { UserService } from './services/user.service'
import { UserRepository } from './repositories/user.repository'

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [UserController],
  providers: [
    // Handlers

    // Repositories
    UserRepository,

    // Mappers
    UserMapper,

    // Services
    UserService
  ],
  exports: [UserService],
})
export class UserModule {}
