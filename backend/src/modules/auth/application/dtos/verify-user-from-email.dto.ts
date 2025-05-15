import { ApiProperty } from '@nestjs/swagger'

export class VerifyUserFromEmailDto {
  @ApiProperty({
    description: "Verification code sent to the user's email.",
    example: '123456',
    required: true,
    minLength: 6,
    maxLength: 6,
  })
  public code: string
}
