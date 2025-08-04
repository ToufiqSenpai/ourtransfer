import { Inject, Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../infrastructure/database/base.repository';
import { User } from '../entities/user.entity';
import { DataSource, EntityManager } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { TRANSACTION_CONTEXT_SERVICE, TransactionContextService } from '../../../infrastructure/database/unit-of-work/transaction-context.service';

@Injectable()
export class UserRepository extends BaseRepository<User, string> {
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
