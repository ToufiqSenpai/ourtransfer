import { Column, Entity } from 'typeorm'
import { BaseEntity } from '../../../../shared/base/base.entity'

@Entity()
export class User extends BaseEntity {
  @Column()
  public name: string

  @Column({ unique: true })
  public email: string
}
