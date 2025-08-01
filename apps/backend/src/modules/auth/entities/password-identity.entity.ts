import { ChildEntity, Column } from 'typeorm';
import { Identity } from './identity.entity';

@ChildEntity()
export class PasswordIdentity extends Identity {
  @Column({ name: 'password_hash' })
  public passwordHash!: string
}
