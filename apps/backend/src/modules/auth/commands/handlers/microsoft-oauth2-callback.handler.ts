import { CommandHandler, ICommandHandler, EventBus } from "@nestjs/cqrs";
import { MicrosoftOAuth2CallbackCommand } from "../microsoft-oauth2-callback.command";
import { OAuth2CallbackResult } from "../../types/oauth2-callback-result.interface";
import { OAuth2Platform } from "../../enums/oauth2-platform.enum";
import { MicrosoftOAuth2Service } from "../../services/microsoft-oauth2.service";
import { RefreshTokenService } from "../../services/refresh-token.service";
import { UserLoggedInEvent } from "../../events/user-logged-in.event";

@CommandHandler(MicrosoftOAuth2CallbackCommand)
export class MicrosoftOAuth2CallbackHandler implements ICommandHandler<MicrosoftOAuth2CallbackCommand> {
  public constructor(
    private readonly microsoftOAuth2Service: MicrosoftOAuth2Service,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly eventBus: EventBus
  ) {}

  public async execute(command: MicrosoftOAuth2CallbackCommand): Promise<OAuth2CallbackResult> {
    const { code, state, userAgent, ipAddress } = command
    const [user, platform] = await this.microsoftOAuth2Service.verify(state, code)
    const refreshToken = await this.refreshTokenService.create(user, userAgent, ipAddress)

    if (platform === OAuth2Platform.WEB) {
      this.eventBus.publish(new UserLoggedInEvent(user))
    }

    return {
      platform,
      refreshToken: refreshToken.token
    };
  }
}
