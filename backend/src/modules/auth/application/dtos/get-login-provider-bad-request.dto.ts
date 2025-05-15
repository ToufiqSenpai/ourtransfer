import { ApiProperty } from '@nestjs/swagger'
import { BaseBadRequestDto } from '../../../../common/dtos/base-bad-request.dto'

class GetLoginProviderErrorMessage {
  @ApiProperty({
    type: [String],
    description: 'List of errors related to the email field.',
    example: ['Email is required.'],
  })
  public email: string[]
}

export class GetLoginProviderBadRequestDto extends BaseBadRequestDto<GetLoginProviderErrorMessage> {
  @ApiProperty({ type: GetLoginProviderErrorMessage, description: 'Detailed error messages for each field.' })
  public errors: GetLoginProviderErrorMessage
}
