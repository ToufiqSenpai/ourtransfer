import { BaseRepository } from 'src/shared/base/base.repository'
import { PasswordAuth } from '../entities/password-auth.entity'

export const PASSWORD_AUTH_REPOSITORY = Symbol('PasswordAuthRepository')

export interface PasswordAuthRepository extends BaseRepository<PasswordAuth, string> {}
