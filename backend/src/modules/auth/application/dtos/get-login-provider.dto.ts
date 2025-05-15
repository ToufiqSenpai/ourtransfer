import { ApiProperty } from '@nestjs/swagger'

export class GetLoginProviderDto {
  @ApiProperty({
    description: 'Email address of the user.',
    example: 'user@example.com',
    format: 'email',
    required: true,
    minLength: 1,
    maxLength: 100,
  })
  public email: string
}
