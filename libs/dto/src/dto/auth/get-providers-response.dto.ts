import { ApiProperty } from "@nestjs/swagger"
import { AuthProvider } from "@ourtransfer/common"

export class GetProvidersResponseDto {
  @ApiProperty({
    enum: AuthProvider,
    description: "The authentication providers used by the user.",
    example: [AuthProvider.GOOGLE],
  })
  public providers!: AuthProvider[]
}
