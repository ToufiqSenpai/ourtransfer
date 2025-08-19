import { ApiProperty } from "@nestjs/swagger"

export class MicrosoftAuthResponseDto {
  @ApiProperty({
    description: "The URL to redirect the user for Microsoft authentication.",
    example: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    required: true,
  })
  public url!: string
}
