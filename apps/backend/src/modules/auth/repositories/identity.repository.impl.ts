import { Inject, Injectable } from '@nestjs/common';
import { BaseRepositoryImpl } from '../../../infrastructure/database/base.repository';
import { Identity } from '../entities/identity.entity';
import { IdentityRepository } from './identity.repository';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AuthProvider } from '@ourtransfer/common';
import {
  TRANSACTION_CONTEXT_SERVICE,
  TransactionContextService
} from '../../../infrastructure/database/unit-of-work/transaction-context.service';

@Injectable()
export class IdentityRepositoryImpl extends BaseRepositoryImpl<Identity, string> implements IdentityRepository {
  public constructor(
    @InjectDataSource() dataSource: DataSource,
    @Inject(TRANSACTION_CONTEXT_SERVICE) transactionContextService: TransactionContextService<EntityManager>
  ) {
    super(dataSource, transactionContextService, Identity);
  }

  public findByUserEmail(userEmail: string): Promise<Identity[]> {
    return this.getRepository()
      .createQueryBuilder('identity')
      .leftJoinAndSelect('identity.user', 'user')
      .where('user.email = :email', { email: userEmail })
      .getMany()
  }

  public async existsEmailAuthProviderByUserId(userId: string): Promise<boolean> {
    return await this.getRepository()
      .createQueryBuilder('identity')
      .where('identity.user_id = :userId', { userId })
      .andWhere('identity.authProvider = :authProvider', { authProvider: AuthProvider.EMAIL })
      .getExists()
  }
}
