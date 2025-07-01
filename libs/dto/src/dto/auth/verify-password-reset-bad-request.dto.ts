import { ApiProperty } from "@nestjs/swagger"

class VerifyPasswordResetErrorMessage {
  @ApiProperty({
    type: [String],
    description: "List of validation error messages for the password field.",
    example: ["Password is required.", "Password must be at least 8 characters."],
  })
  public password!: string[]

  @ApiProperty({
    type: [String],
    description: "List of validation error messages for the confirmPassword field.",
    example: ["Confirm password is required.", "Passwords do not match."],
  })
  public confirmPassword!: string[]

  @ApiProperty({
    type: [String],
    description: "List of validation error messages for the logoutAll.",
    example: ["Logout all sessions is not a boolean value."],
  })
  public logoutAll!: string[]
}

export class VerifyPasswordResetBadRequestDto {
  @ApiProperty({
    type: VerifyPasswordResetErrorMessage,
    description: "Detailed error messages for each field.",
  })
  public errors!: VerifyPasswordResetErrorMessage
}
