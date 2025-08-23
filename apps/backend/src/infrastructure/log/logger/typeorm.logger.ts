import { Injectable, } from '@nestjs/common'
import { Logger } from '../logger.abstract'
import { Logger as ITypeOrmLogger } from 'typeorm'
import { DatabaseLog, LOG_QUEUE, LogQueueJobName } from '../log.consumer'
import { NodeEnv } from '@ourtransfer/common'
import { HttpRequestContext } from '../../../common/http/http-request.context'
import { hostname } from 'os'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'

@Injectable()
export class TypeOrmLogger implements ITypeOrmLogger {
  public constructor(
    @InjectQueue(LOG_QUEUE) private readonly logQueue: Queue<DatabaseLog>,
    private readonly logger: Logger,
    private readonly httpRequestContext: HttpRequestContext,
  ) {}

  public logQuery(query: string): void {
    this.createDatabaseLog({
      query,
      message: 'Query executed'
    })
  }

  public logQueryError(error: string | Error, query: string): void {
    this.createDatabaseLog({
      query,
      message: typeof error === 'string' ? error : error.message,
      error: error instanceof Error ? error : new Error(error),
    })
  }

  public logQuerySlow(time: number, query: string): void {
    this.createDatabaseLog({
      query,
      message: `Slow Query (${time}ms)`
    })
  }

  public logSchemaBuild(message: string): void {
    this.createDatabaseLog({
      message
    })
  }

  public logMigration(message: string): void {
    this.createDatabaseLog({
      message
    })
  }

  public log(level: 'log' | 'info' | 'warn', message: any): void {
    this.logger[level](message)

    this.createDatabaseLog({
      message
    })
  }

  private async createDatabaseLog(data: {
    query?: string,
    message?: string,
    error?: Error
  }): Promise<void> {
    const databaseLog: DatabaseLog = {
      timestamp: new Date().toISOString(),
      query: data.query,
      environment: process.env.NODE_ENV as NodeEnv,
      correlationId: this.httpRequestContext.get()?.correlationId,
      pid: process.pid,
      host: hostname(),
      ...(data.error && {
        error: {
          name: data.error.name,
          message: data.error.message,
          stack: data.error.stack || ''
        }
      })

    }

    await this.logQueue.add(LogQueueJobName.DATABASE, databaseLog)
  }
}
