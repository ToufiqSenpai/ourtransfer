import { ApiProperty } from '@nestjs/swagger'

export class VerifyPasswordResetDto {
  @ApiProperty({
    description: 'The new password to set.',
    example: 'P@ssw0rd!',
    minLength: 1,
    maxLength: 100,
    required: true,
  })
  public password: string

  @ApiProperty({
    description: 'Confirmation of the new password.',
    example: 'P@ssw0rd!',
    minLength: 1,
    maxLength: 100,
    required: true,
  })
  public confirmPassword: string

  @ApiProperty({
    description: 'The token used to verify the password reset request.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: true,
  })
  public token: string
}
