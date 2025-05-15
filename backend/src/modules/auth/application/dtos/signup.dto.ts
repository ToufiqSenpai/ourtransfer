import { ApiProperty } from '@nestjs/swagger'

export class SignupDto {
  @ApiProperty({ description: 'Name of the user.', minLength: 1, maxLength: 99, required: true })
  public name: string

  @ApiProperty({ description: 'Email of the user.', minLength: 1, maxLength: 99, required: true })
  public email: string

  @ApiProperty({ description: 'Password of the user.', minLength: 1, maxLength: 99, required: true })
  public password: string
}
