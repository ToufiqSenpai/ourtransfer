import { ApiProperty } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({
    description: 'Email address of the user.',
    example: 'user@example.com',
    format: 'email',
    required: true,
    minLength: 1,
    maxLength: 100,
  })
  public email: string

  @ApiProperty({
    description: 'Password of the user.',
    example: 'P@ssw0rd!',
    required: true,
    minLength: 1,
    maxLength: 100,
  })
  public password: string
}
