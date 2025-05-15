import { ApiProperty } from '@nestjs/swagger'
import { TransferVerification } from '../enums/transfer-verification.enum'

class CreateFileTransferDto {
  @ApiProperty({ required: true, minLength: 1, maxLength: 255 })
  public name: string

  @ApiProperty()
  public size: number
}

export class CreateTransferDto {
  @ApiProperty({ required: true, minLength: 1, maxLength: 100 })
  public title: string

  @ApiProperty({ required: false, maxLength: 1000 })
  public message: string

  @ApiProperty({ type: [String] })
  public recipients: string[]

  @ApiProperty({ type: [CreateFileTransferDto] })
  public files: CreateFileTransferDto[]

  @ApiProperty()
  public expiresIn: Date

  @ApiProperty({ enum: TransferVerification, default: TransferVerification.ANONYMOUS })
  public verification: TransferVerification

  @ApiProperty({ maxLength: 100 })
  public password: string

  @ApiProperty({ default: true })
  public recoverable: boolean
}
