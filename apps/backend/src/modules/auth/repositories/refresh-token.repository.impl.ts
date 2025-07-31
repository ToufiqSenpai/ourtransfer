import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { BaseRepositoryImpl } from '../../../infrastructure/database/base.repository.impl';
import { RefreshToken } from '../entities/refresh-token.entity';
import { RefreshTokenRepository } from './refresh-token.repository';
import { TRANSACTION_CONTEXT_SERVICE, TransactionContextService } from '../../../infrastructure/database/unit-of-work/transaction-context.service';

@Injectable()
export class RefreshTokenRepositoryImpl extends BaseRepositoryImpl<RefreshToken, string> implements RefreshTokenRepository {
  public constructor(
    @InjectDataSource() dataSource: DataSource,
    @Inject(TRANSACTION_CONTEXT_SERVICE) transactionContextService: TransactionContextService<EntityManager>,
  ) {
    super(dataSource, transactionContextService, RefreshToken)
  }

  public async findByToken(token: string): Promise<RefreshToken | null> {
    return this.getRepository().findOne({
      where: { token },
    })
  }
}
