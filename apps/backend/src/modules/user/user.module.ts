import { forwardRef, Module } from '@nestjs/common'
import { UserController } from './controllers/user.controller'
import { UserMapper } from './mappers/user.mapper'
import { USER_REPOSITORY } from './repositories/user.repository'
import { UserRepositoryImpl} from "./repositories/user.repository.impl"
import { AuthModule } from '../auth/auth.module'
import { UserSignedUpEventHandler } from './events/handlers/user-signed-up.handler'

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [UserController],
  providers: [
    // Handlers
    UserSignedUpEventHandler,

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
