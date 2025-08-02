import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetProvidersQuery } from "../get-providers.query";
import { CommonResponseDto, GetProvidersResponseDto } from "@ourtransfer/dto";
import { Inject, NotFoundException } from "@nestjs/common";
import { IDENTITY_REPOSITORY, IdentityRepository } from "../../repositories/identity.repository";
import { plainToInstance } from "class-transformer";

@QueryHandler(GetProvidersQuery)
export class GetProvidersHandler implements IQueryHandler<GetProvidersQuery> {
  public constructor(@Inject(IDENTITY_REPOSITORY) private readonly identityRepository: IdentityRepository) {}

  public async execute(query: GetProvidersQuery): Promise<GetProvidersResponseDto> {
    const identities = await this.identityRepository.findByUserEmail(query.email)

    if (identities.length === 0) {
      throw new NotFoundException(plainToInstance(CommonResponseDto, {
        message: "No user found with the provided email address."
      }))
    }

    const dto = new GetProvidersResponseDto()
    dto.providers = identities.map(identity => identity.authProvider)

    return dto
  }
}
