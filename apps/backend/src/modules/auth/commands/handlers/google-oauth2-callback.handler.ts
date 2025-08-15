import { CommandHandler, EventBus, ICommandHandler } from "@nestjs/cqrs";
import { GoogleOAuth2CallbackCommand, GoogleOAuth2CallbackCommandResponse } from "../google-oauth2-callback.command";
import { GoogleOAuth2Service } from "../../services/google-oauth2.service";
import { RefreshTokenService } from "../../services/refresh-token.service";
import { OAuth2Platform } from "../../enums/oauth2-platform.enum";
import { UserLoggedInEvent } from "../../events/user-logged-in.event";
import { Transactional } from "../../../../infrastructure/database/unit-of-work/transactional.decorator";

@CommandHandler(GoogleOAuth2CallbackCommand)
export class GoogleOAuth2CallbackHandler implements ICommandHandler<GoogleOAuth2CallbackCommand> {
  public constructor(
    private readonly googleOAuth2Service: GoogleOAuth2Service,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly eventBus: EventBus
  ) {}

  @Transactional()
  public async execute(command: GoogleOAuth2CallbackCommand): Promise<GoogleOAuth2CallbackCommandResponse> {
    const [user, platform] = await this.googleOAuth2Service.verify(command.state, command.code)
    const refreshToken = await this.refreshTokenService.create(user, command.userAgent, command.ipAddress);

    if (platform === OAuth2Platform.WEB) {
      this.eventBus.publish(new UserLoggedInEvent(user))
    }

    return {
      platform,
      refreshToken: refreshToken.token
    }
  }
}
