import { ApiProperty } from '@nestjs/swagger'

export class UpdateUserDto {
  @ApiProperty({
    description: 'Name of the user to be updated.',
    minLength: 1,
    maxLength: 99,
    required: true,
    example: 'John Doe',
  })
  public name: string
}
