import { ApiProperty } from "@nestjs/swagger"
import { BaseBadRequestDto } from "../common/base-bad-request.dto"

class GetProvidersErrorMessage {
  @ApiProperty({
    type: [String],
    description: "List of errors related to the email field.",
    example: ["Email is invalid."],
  })
  public email!: string[]
}

export class GetProvidersBadRequestDto extends BaseBadRequestDto<GetProvidersErrorMessage> {
  @ApiProperty({
    type: GetProvidersErrorMessage,
    description: "Detailed error messages for each field.",
  })
  public errors!: GetProvidersErrorMessage
}
