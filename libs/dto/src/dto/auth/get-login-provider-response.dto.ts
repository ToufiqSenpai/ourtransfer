import { ApiProperty } from "@nestjs/swagger"
import { AuthProvider } from "@ourtransfer/common"

export class GetLoginProviderResponseDto {
  @ApiProperty({
    enum: AuthProvider,
    description: "The authentication provider used by the user.",
    example: AuthProvider.GOOGLE,
  })
  public provider!: AuthProvider
}
