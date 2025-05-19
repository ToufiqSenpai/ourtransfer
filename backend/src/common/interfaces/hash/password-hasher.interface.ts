import { Hasher } from './hasher.interface'

export const PASSWORD_HASHER = Symbol('PasswordHasher')

export type PasswordHasher = Hasher
