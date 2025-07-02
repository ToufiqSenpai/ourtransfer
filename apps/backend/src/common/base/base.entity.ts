import { AutoMap } from '@automapper/classes'
import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  @AutoMap()
  public id!: string

  @CreateDateColumn()
  @AutoMap()
  public createdAt!: Date

  @UpdateDateColumn()
  @AutoMap()
  public updatedAt!: Date
}
