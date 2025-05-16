import { Injectable, Inject } from '@nestjs/common'
import { Logger, LOGGER } from '../../common/interfaces/logger.interface'
import { Logger as ITypeOrmLogger, QueryRunner } from 'typeorm'

@Injectable()
export class TypeOrmLogger implements ITypeOrmLogger {
  public constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  public logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    this.logger.debug(`Query: ${query} -- Parameters: ${JSON.stringify(parameters)}`)
  }

  public logQueryError(error: string | Error, query: string, parameters?: any[], queryRunner?: QueryRunner) {
    this.logger.error(`Error: ${error} -- Query: ${query} -- Parameters: ${JSON.stringify(parameters)}`)
  }

  public logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner) {
    this.logger.warn(`Slow Query (${time}ms): ${query} -- Params: ${JSON.stringify(parameters)}`)
  }

  public logSchemaBuild(message: string, queryRunner?: QueryRunner) {
    this.logger.log(`Schema Build: ${message}`)
  }

  public logMigration(message: string, queryRunner?: QueryRunner) {
    this.logger.log(`Migration: ${message}`)
  }

  public log(level: 'log' | 'info' | 'warn', message: any, queryRunner?: QueryRunner) {
    this.logger[level](message)
  }
}
