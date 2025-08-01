import { User } from "../entities/user.entity";

export class UserSignedUpEvent {
  public constructor(public readonly user: User) {}
}
