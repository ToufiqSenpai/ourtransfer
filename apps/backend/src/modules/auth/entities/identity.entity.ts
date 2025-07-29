import { Column, Entity, ManyToOne, TableInheritance } from 'typeorm';
import { BaseEntity } from '../../../common/base/base.entity';
import { User } from '../../user/entities/user.entity';
import { AuthProvider } from '@ourtransfer/common';

@Entity({ name: "identities" })
@TableInheritance({ column: { type: "varchar", name: "type" } })
export class Identity extends BaseEntity {
  @ManyToOne(() => User, user => user.id)
  public user!: User

  @Column({ type: "enum", enum: AuthProvider, nullable: false })
  public authProvider!: AuthProvider

  @Column()
  public lastSignInAt!: Date

  public updateLastSignInAt(): void {
    this.lastSignInAt = new Date()
  }
}
