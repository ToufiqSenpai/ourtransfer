import { PasswordIdentityRepository } from '../../domain/repositories/password-identity.repository';
import { PasswordIdentity } from '../../domain/entities/password-identity.entity';
import { DataSource } from 'typeorm';

export class PasswordIdentityRepositoryImpl implements PasswordIdentityRepository {
  public constructor(private readonly dataSource: DataSource) {}

  public async create(entity: PasswordIdentity): Promise<PasswordIdentity> {
    return await this.dataSource.getRepository(PasswordIdentity).save(entity)
  }
}
