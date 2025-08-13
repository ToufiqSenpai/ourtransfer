import { ApiProperty } from "@nestjs/swagger"
import { AuthenticationStatus } from "@ourtransfer/common"

export class LoginUnauthorizedDto {
  @ApiProperty({
    description: "The error message describing the reason for the unauthorized response",
    example: "Invalid credentials",
  })
  public message!: string

  @ApiProperty({
    description: "The authentication status",
    example: AuthenticationStatus.INVALID_CREDENTIALS,
    enum: AuthenticationStatus,
  })
  public status!: AuthenticationStatus
}