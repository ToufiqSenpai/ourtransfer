import { Injectable, Inject } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { BaseRepositoryImpl } from '../../../infrastructure/database/base.repository';
import { PasswordIdentity } from '../entities/password-identity.entity';
import { PasswordIdentityRepository } from './password-identity.repository';
import { TRANSACTION_CONTEXT_SERVICE, TransactionContextService } from '../../../infrastructure/database/unit-of-work/transaction-context.service';

@Injectable()
export class PasswordIdentityRepositoryImpl extends BaseRepositoryImpl<PasswordIdentity, string> implements PasswordIdentityRepository {
  public constructor(
    @InjectDataSource() dataSource: DataSource,
    @Inject(TRANSACTION_CONTEXT_SERVICE) transactionContextService: TransactionContextService<EntityManager>,
  ) {
    super(dataSource, transactionContextService, PasswordIdentity)
  }
}
