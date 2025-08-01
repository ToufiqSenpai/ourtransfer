import { Column, Entity, JoinColumn, ManyToOne, TableInheritance } from 'typeorm';
import { BaseEntity } from '../../../common/base/base.entity';
import { User } from '../../user/entities/user.entity';
import { AuthProvider } from '@ourtransfer/common';

@Entity({ name: "identities" })
@TableInheritance({ column: { type: "varchar", name: "type" } })
export class Identity extends BaseEntity {
  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'user_id' })
  public user!: User

  @Column({ name: 'auth_provider', type: "enum", enum: AuthProvider, nullable: false })
  public authProvider!: AuthProvider

  @Column({ name: 'last_sign_in_at', nullable: true })
  public lastSignInAt?: Date

  public updateLastSignInAt(): void {
    this.lastSignInAt = new Date()
  }
}
