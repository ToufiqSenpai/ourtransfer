export const PASSWORD_HASHER = Symbol('PasswordHasher')

export interface PasswordHasher {
  hash(password: string): Promise<string>
  compare(password: string, hashedPassword: string): Promise<boolean>
}
