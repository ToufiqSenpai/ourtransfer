import { AuthProvider } from "@ourtransfer/common";
import { User } from "../../user/entities/user.entity";

export class UserLoggedInEvent {
  public constructor(public readonly user: User, public readonly provider: AuthProvider) {}
}
