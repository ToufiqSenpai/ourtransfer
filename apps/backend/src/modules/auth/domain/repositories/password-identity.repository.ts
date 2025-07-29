import { BaseRepository } from '../../../../common/base/base.repository';
import { PasswordIdentity } from '../entities/password-identity.entity';

export const PASSWORD_IDENTITY_REPOSITORY = Symbol('PasswordIdentityRepository')

export interface PasswordIdentityRepository extends BaseRepository<PasswordIdentity, string> {

}
