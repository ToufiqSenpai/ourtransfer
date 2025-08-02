import { User } from "../../user/entities/user.entity";
import { Identity } from "../entities/identity.entity";

export class UserLoggedInEvent {
  public constructor(public readonly user: User, public readonly identity: Identity) {}
}
