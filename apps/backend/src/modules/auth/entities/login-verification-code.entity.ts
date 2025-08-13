import { Column, Entity, ManyToOne } from "typeorm"
import { BaseEntity } from "../../../common/base/base.entity"
import { User } from "../../user/entities/user.entity"

@Entity('login_verification_codes')
export class LoginVerificationCode extends BaseEntity {
  @ManyToOne(() => User)
  public user!: User

  @Column()
  public code!: string

  @Column()
  public revoked!: boolean

  @Column({ name: 'revoked_at', nullable: true })
  public revokedAt?: Date

  @Column({ name: 'expires_at' })
  public expiresAt!: Date

  public revoke(): void {
    this.revoked = true
    this.revokedAt = new Date()
  }
}
