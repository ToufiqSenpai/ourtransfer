import { Query } from "@nestjs/cqrs";
import { GetProvidersResponseDto } from "@ourtransfer/dto";

export class GetProvidersQuery extends Query<GetProvidersResponseDto> {
  public constructor(public readonly email: string) {
    super();
  }
}
