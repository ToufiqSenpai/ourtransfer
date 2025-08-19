import { Command } from "@nestjs/cqrs";
import { OAuth2CallbackResult } from "../types/oauth2-callback-result.interface";

export class MicrosoftOAuth2CallbackCommand extends Command<OAuth2CallbackResult> {
  public constructor(
    public readonly code: string,
    public readonly state: string,
    public readonly userAgent: string,
    public readonly ipAddress: string
  ) {
    super();
  }
}
