import { ChildEntity, Column } from 'typeorm';
import { Identity } from './identity.entity';

@ChildEntity()
export class PasswordIdentity extends Identity {
  @Column({ nullable: false, unique: true })
  public email!: string

  @Column({ name: 'password_hash', nullable: false })
  public passwordHash!: string
}
