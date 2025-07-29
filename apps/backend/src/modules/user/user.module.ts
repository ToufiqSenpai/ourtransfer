import { Module } from '@nestjs/common'
import { UserController } from './controllers/user.controller'
import { UserMapper } from './mappers/user.mapper'
import { UserRepository } from './repositories/user.repository'

@Module({
  controllers: [UserController],
  providers: [
    // Repositories
    UserRepository,

    // Mappers
    UserMapper,
  ],
  exports: [UserRepository],
})
export class UserModule {}
