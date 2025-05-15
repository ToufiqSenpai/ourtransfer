import { ApiProperty } from '@nestjs/swagger'
import { AuthProvider } from '../../domain/enums/auth-provider.enum'

export class GetLoginProviderResponseDto {
  @ApiProperty({
    enum: AuthProvider,
    description: 'The authentication provider used by the user.',
    example: AuthProvider.GOOGLE,
  })
  public provider: AuthProvider
}
