import { User } from "../../user/entities/user.entity";

export class UserLoggedInEvent {
  public constructor(public readonly user: User) {}
}
