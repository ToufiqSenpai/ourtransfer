import { AutoMap } from "@automapper/classes"
import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm"

export class BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  @AutoMap()
  public id!: string

  @CreateDateColumn({ name: 'created_at' })
  @AutoMap()
  public createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  @AutoMap()
  public updatedAt!: Date
}
