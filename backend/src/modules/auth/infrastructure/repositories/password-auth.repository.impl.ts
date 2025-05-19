import { DataSource } from 'typeorm'
import { PasswordAuth } from '../../domain/entities/password-auth.entity'
import { PasswordAuthRepository } from '../../domain/repositories/password-auth.repository'
import { InjectDataSource } from '@nestjs/typeorm'

export class PasswordAuthRepositoryImpl implements PasswordAuthRepository {
  public constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  public async create(item: PasswordAuth): Promise<PasswordAuth> {
    return await this.dataSource.getRepository(PasswordAuth).save(item)
  }

  public findById(id: string): Promise<PasswordAuth | null> {
    throw new Error('Method not implemented.')
  }

  public findByEmail(email: string): Promise<PasswordAuth | null> {
    return this.dataSource
      .getRepository(PasswordAuth)
      .createQueryBuilder()
      .leftJoinAndSelect('passwordAuth.user', 'user')
      .where('passwordAuth.email = :email', { email })
      .getOne()
  }

  public findAll(): Promise<PasswordAuth[]> {
    throw new Error('Method not implemented.')
  }

  public update(id: string, item: PasswordAuth): Promise<PasswordAuth> {
    throw new Error('Method not implemented.')
  }

  public delete(id: string): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
