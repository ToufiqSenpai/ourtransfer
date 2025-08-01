import { BaseRepository } from '../../../infrastructure/database/base.repository';
import { Identity } from '../entities/identity.entity';

export const IDENTITY_REPOSITORY = Symbol('IdentityRepository')

export interface IdentityRepository extends BaseRepository<Identity, string> {
  findByUserEmail(email: string): Promise<Identity | null>
}
