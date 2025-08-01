export const IDENTITY_SERVICE = Symbol('IdentityService')

export interface IdentityService {
  throwIfIdentityExists(userEmail: string): Promise<void | never>
}
