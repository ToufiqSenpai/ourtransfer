import { BaseBadRequestDto } from '../common/base-bad-request.dto';
import { ApiProperty } from "@nestjs/swagger"

class CreateTransferBadRequestErrors {
  @ApiProperty({ type: [String] })
  public title?: string[]

  @ApiProperty({ type: [String] })
  public message?: string[]

  @ApiProperty({ type: [String] })
  public recipients?: string[]

  @ApiProperty({ type: [String] })
  public verification?: string[]

  @ApiProperty({ type: [String] })
  public password?: string[]

  @ApiProperty({ type: [String] })
  public expiresAt?: string[]

  @ApiProperty({ type: [String] })
  public recoverable?: string[]

  @ApiProperty({ type: [String] })
  public files?: string[][]
}

export class CreateTransferBadRequestDto extends BaseBadRequestDto<CreateTransferBadRequestErrors> {
  public errors!: CreateTransferBadRequestErrors
}
