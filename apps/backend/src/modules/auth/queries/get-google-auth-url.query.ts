import { Query } from "@nestjs/cqrs";
import { GoogleAuthResponseDto } from "@ourtransfer/dto";
import { OAuth2Platform } from "../enums/oauth2-platform.enum";

export class GetGoogleAuthUrlQuery extends Query<GoogleAuthResponseDto> {
  public constructor(public readonly platform: OAuth2Platform) {
    super();
  }
}
