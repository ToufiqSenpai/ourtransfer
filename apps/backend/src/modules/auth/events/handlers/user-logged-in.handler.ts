import { IEventHandler } from "@nestjs/cqrs";
import { UserLoggedInEvent } from "../user-logged-in.event";
import { Inject } from "@nestjs/common";
import { LOGGER, Logger } from "../../../../infrastructure/logger/logger.interface";
import { IDENTITY_REPOSITORY, IdentityRepository } from "../../repositories/identity.repository";
import { USER_REPOSITORY, UserRepository } from "../../../user/repositories/user.repository";
import { UNIT_OF_WORK, UnitOfWork } from "../../../../infrastructure/database/unit-of-work/unit-of-work.interface";

export class UserLoggedInHandler implements IEventHandler<UserLoggedInEvent> {
  public constructor(
    @Inject(LOGGER) private readonly logger: Logger,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
    @Inject(IDENTITY_REPOSITORY) private readonly identityRepository: IdentityRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository
  ) {}

  public async handle(event: UserLoggedInEvent): Promise<void> {
    const user = event.user
    const identity = event.identity

    // Update last sign in timestamps in transaction
    try {
      await this.unitOfWork.transaction(async () => {
        user.updateLastSignInAt()
        await this.userRepository.update(user.id, user)

        identity.updateLastSignInAt()
        await this.identityRepository.update(identity.id, identity)
      })
    } catch (updateError) {
      // Log the error but don't fail the login since tokens are already generated
      this.logger.error('Failed to update last sign in timestamps', updateError)
    }
  }
}
