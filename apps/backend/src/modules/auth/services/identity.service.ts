import { AuthProvider } from "@ourtransfer/common"

export const IDENTITY_SERVICE = Symbol('IdentityService')

export interface IdentityService {
  throwIfIdentityExists(userEmail: string, exceptsProvider?: AuthProvider[]): Promise<void | never>
}
