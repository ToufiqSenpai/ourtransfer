import { ApiProperty } from "@nestjs/swagger"

export class PasswordResetDto {
  @ApiProperty({
    description: "Email address of the user requesting a password reset.",
    example: "user@example.com",
    minLength: 1,
    maxLength: 100,
    required: true,
  })
  public email!: string
}
