import { Column, Entity, JoinColumn, OneToOne } from "typeorm"
import { BaseEntity } from '../../../common/base/base.entity'
import { AutoMap } from '@automapper/classes'
import { TwoFactorAuthentication } from "../../auth/entities/two-factor-authentication.entity"

@Entity({ name: "users" })
export class User extends BaseEntity {
  @Column()
  @AutoMap()
  public name!: string

  @Column({ unique: true })
  @AutoMap()
  public email!: string

  @Column({ nullable: true })
  @AutoMap()
  public password?: string

  @OneToOne(() => TwoFactorAuthentication, { nullable: true, eager: true })
  @JoinColumn()
  public twoFactorAuthentication?: TwoFactorAuthentication

  @Column({ name: 'last_sign_in_at', nullable: true })
  public lastSignInAt?: Date

  public updateLastSignInAt(): void {
    this.lastSignInAt = new Date()
  }
}
