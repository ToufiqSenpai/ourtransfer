import { User } from '../entities/user.entity'
import { BaseRepository } from "../../../infrastructure/database/base.repository"

export const USER_REPOSITORY = Symbol('UserRepository')

export interface UserRepository extends BaseRepository<User, string> {
  findByEmail(email: string): Promise<User | null>
  existsByEmail(email: string): Promise<boolean>
}
