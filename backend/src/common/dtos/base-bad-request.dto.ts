import { ApiProperty } from '@nestjs/swagger'

export abstract class BaseBadRequestDto<E> {
  @ApiProperty({
    description: 'A message describing the error.',
    example: 'Validation failed.',
  })
  public message: string

  @ApiProperty({
    description: 'An object containing detailed error information.',
    example: { field: ['Field is required.'] },
  })
  public abstract errors: E
}
