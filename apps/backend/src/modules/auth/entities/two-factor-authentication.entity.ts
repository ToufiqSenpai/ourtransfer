import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../../common/base/base.entity";

@Entity({ name: 'two_factor_authentications' })
export class TwoFactorAuthentication extends BaseEntity {
  @Column()
  public secret!: string
}
