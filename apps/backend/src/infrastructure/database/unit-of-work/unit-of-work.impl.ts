import { UnitOfWork } from './unit-of-work.interface';
import { Injectable, Inject } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { TransactionContextService, TRANSACTION_CONTEXT_SERVICE } from './transaction-context.service';
import { Logger, LOGGER } from '../../logger/logger.interface';

@Injectable()
export class UnitOfWorkImpl implements UnitOfWork {
  public constructor(
    private readonly dataSource: DataSource,
    @Inject(LOGGER) private readonly logger: Logger,
    @Inject(TRANSACTION_CONTEXT_SERVICE)
    private readonly transactionContext: TransactionContextService<EntityManager>
  ) {
  }

  public async transaction<T>(callback: () => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      this.logger.verbose('Starting transaction');
      await queryRunner.startTransaction();

      // Execute the callback within the AsyncLocalStorage context
      const result = await this.transactionContext.run(queryRunner.manager, callback);

      await queryRunner.commitTransaction();
      this.logger.verbose('Transaction committed successfully');
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Transaction rolled back due to an error', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
