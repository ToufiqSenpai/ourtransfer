import { BaseEntity, Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { User } from '../../../user/domain/entities/user.entity'

@Entity()
export class RefreshToken extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn()
  public user: User

  @Column({ unique: true })
  public token: string

  @Column()
  public userAgent: string

  @Column()
  public ipAddress: string

  @Column()
  public expiresAt: Date

  @Column({ default: false })
  public revoked: boolean = false
}
