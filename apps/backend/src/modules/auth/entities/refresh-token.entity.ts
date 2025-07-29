import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/base/base.entity';
import { User } from '../../user/entities/user.entity';

@Entity({ name: 'refresh_tokens' })
export class RefreshToken extends BaseEntity {
  @ManyToOne(() => User, user => user.id)
  @JoinColumn()
  public user!: User

  @Column({ unique: true })
  public token!: string

  @Column({ name: 'user_agent' })
  public userAgent!: string

  @Column({ name: 'ip_address' })
  public ipAddress!: string

  @Column()
  public revoked: boolean = false

  @Column({ name: 'revoked_at', nullable: true })
  public revokedAt?: Date

  @Column({ name: 'expires_at' })
  public expiresAt!: Date

  public revoke(): void {
    this.revoked = true
    this.revokedAt = new Date()
  }
}
