import { Module } from '@nestjs/common'
import { UserController } from './presentation/controllers/user.controller'
import { UserProfile } from './application/profiles/user.profile'
import { USER_REPOSITORY } from './domain/repositories/user.repository'
import { UserRepositoryImpl } from './infrastructure/repositories/user.repository.impl'
// import { IsUserExistsByEmailHandler } from './application/queries/handlers/is-user-exists-by-email.handler'
// import { GetUserByIdHandler } from './application/queries/handlers/get-user-by-id.handler'
// import { UpdateUserAvatarHandler } from './application/commands/handlers/update-user-avatar.handler'
// import { GetUserAvatarHandler } from './application/queries/handlers/get-user-avatar.handler'

@Module({
  controllers: [UserController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: UserRepositoryImpl,
    },
    UserProfile,

    // Handlers
    // IsUserExistsByEmailHandler,
    // GetUserByIdHandler,
    // UpdateUserAvatarHandler,
    // GetUserAvatarHandler,
  ],
  exports: [
    {
      provide: USER_REPOSITORY,
      useClass: UserRepositoryImpl,
    },
  ],
})
export class UserModule {}
