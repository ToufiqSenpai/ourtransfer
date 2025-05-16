import { BaseRepository } from '../../../../shared/base/base.repository'
import { User } from '../entities/user.entity'

export const USER_REPOSITORY = Symbol('UserRepository')

export interface UserRepository extends BaseRepository<User, string> {
  findByEmail(email: string): Promise<User | null>
  isEmailUnique(email: string): Promise<boolean>
}
