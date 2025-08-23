import { IEventHandler } from "@nestjs/cqrs";
import { UserLoggedInEvent } from "../user-logged-in.event";
import { Logger } from "../../../../infrastructure/log/logger.abstract";
import { UserRepository } from "../../../user/repositories/user.repository";

export class UserLoggedInHandler implements IEventHandler<UserLoggedInEvent> {
  public constructor(
    private readonly logger: Logger,
    private readonly userRepository: UserRepository,
  ) {}

  public async handle(event: UserLoggedInEvent): Promise<void> {
    const user = event.user

    // Update last sign in timestamps in transaction
    try {
      user.updateLastSignInAt()

      await this.userRepository.update(user.id, user)
    } catch (updateError) {
      // Log the error but don't fail the login since tokens are already generated
      this.logger.error('Failed to update last sign in timestamps', updateError)
    }
  }
}
