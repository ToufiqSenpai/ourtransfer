import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { UserSignedUpEvent } from '../user-signed-up.event';
import { Inject } from "@nestjs/common";
import { IDENTITY_REPOSITORY, IdentityRepository } from "../../../auth/repositories/identity.repository";
import { Identity } from "../../../auth/entities/identity.entity";
import { AuthProvider } from "@ourtransfer/common";
import { Logger, LOGGER } from '../../../../infrastructure/logger/logger.interface';

@EventsHandler(UserSignedUpEvent)
export class UserSignedUpEventHandler implements IEventHandler<UserSignedUpEvent> {
  public constructor(
    @Inject(LOGGER) private readonly logger: Logger,
    @Inject(IDENTITY_REPOSITORY) private readonly identityRepository: IdentityRepository
  ) {}

  public async handle(event: UserSignedUpEvent): Promise<void> {
    const exists = await this.identityRepository.existsEmailAuthProviderByUserId(event.user.id)

    if (exists) {
      this.logger.warn(`Email identity already exists for user ${event.user.id}`)
      return
    }

    const identity = new Identity()
    identity.authProvider = AuthProvider.EMAIL
    identity.user = event.user

    try {
      await this.identityRepository.insert(identity)
    } catch (error) {
      this.logger.error(`Failed to handle UserSignedUpEvent for user ${event.user.id}`, error)
    }
  }
}
