import { ApiProperty } from '@nestjs/swagger'

class VerifyPasswordResetErrorMessage {
  @ApiProperty({
    type: [String],
    description: 'List of validation error messages for the password field.',
    example: ['Password is required.', 'Password must be at least 8 characters.'],
  })
  public password: string[]
}
