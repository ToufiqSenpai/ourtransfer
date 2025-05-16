import { User } from '../../../user/domain/entities/user.entity'
import { BaseEntity } from '../../../../shared/base/base.entity'
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm'
import { AutoMap } from '@automapper/classes'

@Entity()
export class PasswordAuth extends BaseEntity {
  @Column()
  @AutoMap()
  public userEmail: string

  @Column()
  @AutoMap()
  public password: string

  @OneToOne(() => User)
  @JoinColumn({ name: 'userEmail', referencedColumnName: 'email' })
  public user: User
}
