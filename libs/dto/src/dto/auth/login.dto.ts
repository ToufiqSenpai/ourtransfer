import { ApiProperty } from "@nestjs/swagger"

export class LoginDto {
  @ApiProperty({
    description: "Email address of the user.",
    example: "user@example.com",
    format: "email",
    required: true,
    minLength: 1,
    maxLength: 100,
  })
  public email!: string

  @ApiProperty({
    description: "Password of the user.",
    example: "P@ssw0rd!",
    required: false,
    minLength: 1,
    maxLength: 100,
  })
  public password?: string

  @ApiProperty({
    description: "Verification code sent to the user's email address if the user's password is not set.",
    example: "123456",
    required: false,
    minLength: 6,
    maxLength: 6,
  })
  public verificationCode?: string

  @ApiProperty({
    description: "Two-factor authentication code.",
    example: "123456",
    required: false,
    minLength: 6,
    maxLength: 6,
  })
  public twoFactorCode?: string
}
