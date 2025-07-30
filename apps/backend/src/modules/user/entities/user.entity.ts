import { Column, Entity, OneToMany } from "typeorm"
import { BaseEntity } from '../../../common/base/base.entity'
import { AutoMap } from '@automapper/classes'
import { Identity } from "../../auth/entities/identity.entity"

@Entity({ name: "users" })
export class User extends BaseEntity {
  @OneToMany(() => Identity, (identity) => identity.user)
  public identities?: Identity[]

  @Column()
  @AutoMap()
  public name!: string

  @Column({ unique: true })
  @AutoMap()
  public email!: string

  @Column({ name: 'last_sign_in_at' })
  public lastSignInAt!: Date

  public updateLastSignInAt(): void {
    this.lastSignInAt = new Date()
  }
}
