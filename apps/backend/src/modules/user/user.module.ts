import { Module } from '@nestjs/common'
import { UserController } from './controllers/user.controller'
import { UserMapper } from './mappers/user.mapper'
import { USER_REPOSITORY } from './repositories/user.repository'
import { UserRepositoryImpl} from "./repositories/user.repository.impl"

@Module({
  controllers: [UserController],
  providers: [
    // Repositories
    {
      provide: USER_REPOSITORY,
      useClass: UserRepositoryImpl,
    },

    // Mappers
    UserMapper,
  ],
  exports: [USER_REPOSITORY],
})
export class UserModule {}
