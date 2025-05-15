import { ApiProperty } from '@nestjs/swagger'
import { BaseBadRequestDto } from '../../../../common/dtos/base-bad-request.dto'

class SignupErrorMessage {
  @ApiProperty({
    type: [String],
    description: 'List of errors related to the name field.',
    example: ['Name is required.'],
  })
  public name: string[]

  @ApiProperty({
    type: [String],
    description: 'List of errors related to the email field.',
    example: ['Email is invalid.'],
  })
  public email: string[]

  @ApiProperty({
    type: [String],
    description: 'List of errors related to the password field.',
    example: ['Password must be at least 8 characters.'],
  })
  public password: string[]
}

export class SignupBadRequestDto extends BaseBadRequestDto<SignupErrorMessage> {
  @ApiProperty({ type: SignupErrorMessage, description: 'Detailed error messages for each field.' })
  public errors: SignupErrorMessage
}
