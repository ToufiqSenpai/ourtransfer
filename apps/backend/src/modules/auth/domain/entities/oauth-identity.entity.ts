import { Identity } from './identity.entity';
import { ChildEntity, Column } from 'typeorm';

@ChildEntity()
export class OauthIdentity extends Identity {
  @Column({ nullable: false, unique: true })
  public providerUserId!: string
}
