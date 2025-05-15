import { User } from '../../../user/domain/entities/user.entity'
import { BaseEntity } from 'src/shared/base/base.entity'
import { Column, JoinColumn, OneToOne } from 'typeorm'

export class PasswordAuth extends BaseEntity {
  @Column()
  public userEmail: string

  @Column()
  public password: string

  @OneToOne(() => User)
  @JoinColumn({ name: 'userEmail', referencedColumnName: 'email' })
  @Column({ nullable: true })
  public user: User
}
