import { TransferVerification, TransferStatus } from "@ourtransfer/common"
import { UserDto } from "../user/user.dto"

export class TransferDto {
  public title!: string
  public message!: string
  public recipients!: string[]
  public verification!: TransferVerification
  public recoverable!: boolean
  public status!: TransferStatus
  public totalDownloads!: number
  public creator!: UserDto
  public passwordProtected!: boolean
  public requester!: UserDto
  public expiresAt!: Date
  public createdAt!: Date
  public updatedAt!: Date
}
