import { ApiProperty } from '@nestjs/swagger'

export class CommonResponseDto {
  @ApiProperty({
    description: 'A message describing the result of the operation.',
    example: 'Operation completed successfully.',
  })
  public message: string
}
