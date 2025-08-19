import { Query } from "@nestjs/cqrs";
import { MicrosoftAuthResponseDto } from "@ourtransfer/dto";
import { OAuth2Platform } from "../enums/oauth2-platform.enum";

export class GetMicrosoftAuthUrlQuery extends Query<MicrosoftAuthResponseDto> {
  public constructor(public readonly platform: OAuth2Platform) {
    super();
  }
}
