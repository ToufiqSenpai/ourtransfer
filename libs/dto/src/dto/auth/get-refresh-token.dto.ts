import { ApiProperty } from "@nestjs/swagger"

export class GetRefreshTokenDto {
  @ApiProperty({ description: "Refresh token is required when cookies are not set." })
  public refreshToken!: string
}
