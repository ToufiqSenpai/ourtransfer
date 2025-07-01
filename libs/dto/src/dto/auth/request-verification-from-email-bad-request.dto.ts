import { ApiProperty } from "@nestjs/swagger"
import { BaseBadRequestDto } from "../common/base-bad-request.dto"

class RequestVerificationErrorMessage {
  @ApiProperty({
    type: [String],
    description: "List of errors related to the email field.",
    example: ["Email is invalid."],
  })
  public email!: string[]
}

export class RequestVerificationFromEmailBadRequestDto extends BaseBadRequestDto<RequestVerificationErrorMessage> {
  @ApiProperty({
    type: RequestVerificationErrorMessage,
    description: "Detailed error messages for each field.",
  })
  public errors!: RequestVerificationErrorMessage
}
