import { PasswordIdentity } from "../entities/password-identity.entity"
import { BaseRepository } from "../../../infrastructure/database/base.repository"

export const PASSWORD_IDENTITY_REPOSITORY = Symbol("PasswordIdentityRepository")

export type PasswordIdentityRepository = BaseRepository<PasswordIdentity, string>
