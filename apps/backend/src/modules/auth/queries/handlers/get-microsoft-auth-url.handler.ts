import { QueryHandler, IQueryHandler } from "@nestjs/cqrs";
import { GetMicrosoftAuthUrlQuery } from "../get-microsoft-auth-url.query";
import { MicrosoftOAuth2Service } from "../../services/microsoft-oauth2.service";
import { MicrosoftAuthResponseDto } from "@ourtransfer/dto";

@QueryHandler(GetMicrosoftAuthUrlQuery)
export class GetMicrosoftAuthUrlHandler implements IQueryHandler<GetMicrosoftAuthUrlQuery> {
  public constructor(
    private readonly microsoftOAuth2Service: MicrosoftOAuth2Service,
  ) {}

  public async execute(query: GetMicrosoftAuthUrlQuery): Promise<MicrosoftAuthResponseDto> {
    const url = await this.microsoftOAuth2Service.getAuthUrl(query.platform)
    const dto = new MicrosoftAuthResponseDto()
    dto.url = url

    return dto
  }
}
