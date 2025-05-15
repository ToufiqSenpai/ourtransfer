import { ApiProperty } from '@nestjs/swagger'

export class RequestVerificationFromEmailDto {
  @ApiProperty({
    description: 'Email address of the user requesting verification.',
    example: 'user@example.com',
    format: 'email',
    required: true,
    minLength: 1,
    maxLength: 100,
  })
  public email: string
}
