import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetGoogleAuthUrlQuery } from "../get-google-auth-url.query";
import { GoogleAuthResponseDto } from "@ourtransfer/dto";
import { GoogleOAuth2Service } from "../../services/google-oauth2.service";

@QueryHandler(GetGoogleAuthUrlQuery)
export class GetGoogleAuthUrlHandler implements IQueryHandler<GetGoogleAuthUrlQuery> {
  public constructor(private readonly googleOAuth2Service: GoogleOAuth2Service) {}

  public async execute(query: GetGoogleAuthUrlQuery): Promise<GoogleAuthResponseDto> {
    const url = await this.googleOAuth2Service.getAuthUrl(query.platform);
    const dto = new GoogleAuthResponseDto()
    dto.url = url;

    return dto;
  }
}
