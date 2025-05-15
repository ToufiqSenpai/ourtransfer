import { ApiProperty } from '@nestjs/swagger'
import { BaseBadRequestDto } from '../../../../common/dtos/base-bad-request.dto'

class VerifyUserFromEmailErrorMessage {
  @ApiProperty({
    type: [String],
    description: 'List of errors related to the code field.',
    example: ['Code is invalid.'],
  })
  public code: string[]
}

export class VerifyUserFromEmailBadRequestDto extends BaseBadRequestDto<VerifyUserFromEmailErrorMessage> {
  @ApiProperty({
    type: VerifyUserFromEmailErrorMessage,
    description: 'Detailed error messages for each field.',
  })
  public errors: VerifyUserFromEmailErrorMessage
}
