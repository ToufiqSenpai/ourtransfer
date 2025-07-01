import { ApiProperty } from "@nestjs/swagger"

export class GoogleAuthResponseDto {
  @ApiProperty({
    description: "The URL to redirect the user for Google authentication.",
    example: "https://accounts.google.com/o/oauth2/auth",
    required: true,
  })
  public url!: string
}
