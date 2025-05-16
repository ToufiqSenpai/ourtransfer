import { Column, Entity } from 'typeorm'
import { BaseEntity } from '../../../../shared/base/base.entity'
import { AutoMap } from '@automapper/classes'

@Entity()
export class User extends BaseEntity {
  @Column()
  @AutoMap()
  public name: string

  @Column({ unique: true })
  @AutoMap()
  public email: string
}
