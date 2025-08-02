import { ApiProperty } from "@nestjs/swagger"

export class RequestVerificationFromEmailDto {
  @ApiProperty({
    type: String,
    description: "The email address to verify.",
    example: "user@example.com"
  })
  public email!: string
}
