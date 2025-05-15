import { BaseBadRequestDto } from '../../../../common/dtos/base-bad-request.dto'
import { ApiProperty } from '@nestjs/swagger'

class UpdateUserErrorMessage {
  @ApiProperty({
    type: [String],
    description: 'List of errors related to the name field.',
    example: ['Name must not be empty.', 'Name must be at least 3 characters.'],
  })
  public name: string[]
}

export class UpdateUserBadRequestDto extends BaseBadRequestDto<UpdateUserErrorMessage> {
  @ApiProperty({
    type: UpdateUserErrorMessage,
    description: 'Detailed error messages for each field.',
  })
  public errors: UpdateUserErrorMessage
}
