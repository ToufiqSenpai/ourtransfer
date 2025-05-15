import { Module } from '@nestjs/common'
import { UserController } from './presentation/controllers/user.controller'
import { CreateUserHandler } from './application/commands/handlers/create-user.handler'
import { UserProfile } from './application/profiles/user.profile'
import { USER_REPOSITORY } from './domain/repositories/user.repository'
import { UserRepositoryImpl } from './infrastructure/repositories/user.repository.impl'
import { IsUserEmailUniqueHandler } from './application/queries/handlers/is-user-email-unique.handler'

@Module({
  controllers: [UserController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: UserRepositoryImpl,
    },
    UserProfile,
    CreateUserHandler,
    IsUserEmailUniqueHandler,
  ],
  exports: [
    {
      provide: USER_REPOSITORY,
      useClass: UserRepositoryImpl,
    },
  ],
})
export class UserModule {}
