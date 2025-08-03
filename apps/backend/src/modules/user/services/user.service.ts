import { Readable } from "stream"
import { User } from "../entities/user.entity"

export const USER_SERVICE = Symbol("UserService")

export interface UserService {
  createUser(name: string, email: string): Promise<User>
  putUserAvatar(userId: string, avatar: Readable): Promise<void>
}
