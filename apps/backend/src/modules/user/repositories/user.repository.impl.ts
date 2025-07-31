import { Inject, Injectable } from '@nestjs/common';
import { BaseRepositoryImpl } from '../../../infrastructure/database/base.repository.impl';
import { User } from '../entities/user.entity';
import { UserRepository } from './user.repository'
import { DataSource, EntityManager } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { TRANSACTION_CONTEXT_SERVICE, TransactionContextService } from '../../../infrastructure/database/unit-of-work/transaction-context.service';

@Injectable()
export class UserRepositoryImpl extends BaseRepositoryImpl<User, string> implements UserRepository {
  public constructor(
    @InjectDataSource() dataSource: DataSource,
    @Inject(TRANSACTION_CONTEXT_SERVICE) transactionContextService: TransactionContextService<EntityManager>
  ) {
    super(dataSource, transactionContextService, User)
  }

  public existsByEmail(email: string): Promise<boolean> {
    return this.getRepository().existsBy({ email })
  }

  public findByEmail(email: string): Promise<User | null> {
    return this.getRepository().findOneBy({ email })
  }
}
