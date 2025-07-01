import { TransferVerification } from "@ourtransfer/common"
import { ApiProperty } from "@nestjs/swagger"

export class CreateTransferFileDto {
  @ApiProperty({ description: "Name of the file", minLength: 1, maxLength: 1000, example: "cat.jpg" })
  public name!: string

  @ApiProperty({ description: "Size of the file in bytes", example: 1024 })
  public size!: number
}

export class CreateTransferDto {
  @ApiProperty({ description: "Title of the transfer", minLength: 1, maxLength: 255, example: "My first transfer" })
  public title!: string

  @ApiProperty({
    description: "Message of the transfer",
    required: false,
    maxLength: 5000,
    example: "This is a test transfer",
  })
  public message?: string

  @ApiProperty({
    description: "A list of emails to send the transfer to",
    required: false,
    default: [],
    example: ["johndoe@example.com"],
  })
  public emailTo?: string[] = []

  @ApiProperty({
    description:
      "The verification type for the transfer. If the verification is set to tracked, a user must be verified to download this file.",
    default: TransferVerification.ANONYMOUS,
    enum: TransferVerification,
    required: false,
  })
  public verification?: TransferVerification = TransferVerification.ANONYMOUS

  @ApiProperty({
    description: "If password is set, a user must input the password before user download the file.",
    required: false,
    minLength: 1,
    maxLength: 255,
    example: "12345678",
  })
  public password?: string

  @ApiProperty({ description: "The expiration date of the transfer", example: "2025-07-08T09:25:53.342Z" })
  public expiresAt!: Date

  @ApiProperty({
    description:
      "Whether the transfer is recoverable or not. If set to true, the file can be recoverable even after it expires. Transfers will be remain available for an extended period before being permanently deleted.",
    default: false,
  })
  public recoverable: boolean = false

  @ApiProperty({ type: [CreateTransferFileDto], description: "A list of files to be transferred.", minItems: 1 })
  public files!: CreateTransferFileDto[]
}
