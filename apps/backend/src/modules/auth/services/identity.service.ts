import { AuthProvider } from "@ourtransfer/common"
import { User } from "../../user/entities/user.entity"
import { Identity } from "../entities/identity.entity"

export const IDENTITY_SERVICE = Symbol('IdentityService')

export interface IdentityService {
  createEmailIdentity(user: User): Promise<Identity>
  throwIfIdentityExists(userEmail: string, exceptsProvider?: AuthProvider[]): Promise<void | never>
}
