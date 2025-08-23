import { Processor, WorkerHost } from "@nestjs/bullmq"
import { Job } from 'bullmq'
import { HttpStatus, RequestMethod, OnModuleInit } from "@nestjs/common"
import { LogLevel } from '../../common/enums/log-level.enum';
import { NodeEnv } from '@ourtransfer/common';
import { Client as ElasticSearchClient } from '@elastic/elasticsearch';
import { Logger } from "./logger.abstract";

export const LOG_QUEUE = "log"

@Processor(LOG_QUEUE)
export class LogConsumer extends WorkerHost implements OnModuleInit {
  public constructor(
    private readonly elasticSearch: ElasticSearchClient,
    private readonly logger: Logger,
  ) {
    super();
  }

  public async process(job: Job<LogConsumerData, any, LogQueueJobName>): Promise<void> {
    try {
      switch (job.name) {
        case LogQueueJobName.HTTP_REQUEST:
          await this.processHttpRequestLog(job.data as HttpRequestLog)
          break
        case LogQueueJobName.APPLICATION:
          await this.processApplicationLog(job.data as ApplicationLog)
          break
        case LogQueueJobName.DATABASE:
          await this.processDatabaseLog(job.data as DatabaseLog)
          break
        default:
          this.logger.warn(`Unknown log job type: ${job.name}`)
      }
    } catch (error) {
      this.logger.error(`Failed to process log job ${job.name}: ${error}`, error)
      throw error // Re-throw to trigger job retry
    }
  }

  private async processHttpRequestLog(data: HttpRequestLog): Promise<void> {
    const indexName = this.generateIndexName('http-requests', data.timestamp)

    try {
      await this.elasticSearch.index({
        index: indexName,
        body: {
          '@timestamp': data.timestamp,
          log_type: 'http_request',
          method: data.method,
          path: data.path,
          status_code: data.statusCode,
          execution_time: data.executionTime,
          user_id: data.userId,
          request_id: data.requestId,
          correlation_id: data.correlationId,
          ip_address: data.ipAddress,
          user_agent: data.userAgent,
          referer: data.referer,
          origin: data.origin,
          accept_language: data.acceptLanguage,
          pid: data.pid,
          host: data.host,
          // Additional fields for Elasticsearch analysis
          status_class: Math.floor(data.statusCode / 100) + 'xx',
          is_error: data.statusCode >= HttpStatus.BAD_REQUEST,
          is_slow: data.executionTime > 1000,
          path_normalized: this.normalizePath(data.path)
        }
      })

      this.logger.debug(`HTTP request log indexed successfully: ${data.requestId}`)
    } catch (error) {
      this.logger.error(`Failed to index HTTP request log: ${error}`, error)
      throw error
    }
  }

  private async processApplicationLog(data: ApplicationLog): Promise<void> {
    const indexName = this.generateIndexName('application-logs', data.timestamp)

    try {
      await this.elasticSearch.index({
        index: indexName,
        body: {
          '@timestamp': data.timestamp,
          log_type: 'application',
          level: data.level,
          context: data.context,
          message: data.message,
          error: data.error ? {
            name: data.error.name,
            message: data.error.message,
            stack: data.error.stack
          } : undefined,
          correlation_id: data.correlationId,
          environment: data.environment,
          pid: data.pid,
          host: data.host,
          args: data.args,
          // Additional fields for Elasticsearch analysis
          has_error: !!data.error,
          level_numeric: this.getLevelNumeric(data.level),
          is_critical: data.level === LogLevel.FATAL || data.level === LogLevel.ERROR
        }
      })

      this.logger.debug(`Application log indexed successfully: ${data.context}`)
    } catch (error) {
      this.logger.error(`Failed to index application log: ${error}`, error)
      throw error
    }
  }

  private async processDatabaseLog(data: DatabaseLog): Promise<void> {
    const indexName = this.generateIndexName('database-logs', data.timestamp)

    try {
      await this.elasticSearch.index({
        index: indexName,
        body: {
          '@timestamp': data.timestamp,
          log_type: 'database',
          message: data.message,
          query: data.query,
          error: data.error ? {
            name: data.error.name,
            message: data.error.message,
            stack: data.error.stack
          } : undefined,
          correlation_id: data.correlationId,
          environment: data.environment,
          pid: data.pid,
          host: data.host,
          metadata: data.metadata,
          // Additional fields for Elasticsearch analysis
          has_error: !!data.error,
          has_query: !!data.query
        }
      })

      this.logger.debug(`Database log indexed successfully`)
    } catch (error) {
      this.logger.error(`Failed to index database log: ${error}`, error)
      throw error
    }
  }

  private generateIndexName(prefix: string, timestamp: string): string {
    const date = new Date(timestamp).toISOString().split('T')[0] // YYYY-MM-DD
    return `${prefix}-${date}`
  }

  private normalizePath(path: string): string {
    // Replace dynamic segments with placeholders for better aggregation
    return path
      .replace(/\/\d+/g, '/{id}')
      .replace(/\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, '/{uuid}')
      .replace(/\/[a-zA-Z0-9]{20,}/g, '/{hash}')
  }

  private getLevelNumeric(level: LogLevel): number {
    const levelMap: Record<LogLevel, number> = {
      [LogLevel.TRACE]: 0,
      [LogLevel.DEBUG]: 1,
      [LogLevel.VERBOSE]: 2,
      [LogLevel.INFO]: 3,
      [LogLevel.WARN]: 4,
      [LogLevel.ERROR]: 5,
      [LogLevel.FATAL]: 6
    }
    return levelMap[level] || 3
  }

  public async onModuleInit(): Promise<void> {
    try {
      // HTTP Request logs template
      await this.elasticSearch.indices.putIndexTemplate({
        name: 'http-requests-template',
        index_patterns: ['http-requests-*'],
        template: {
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              log_type: { type: 'keyword' },
              method: { type: 'keyword' },
              path: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              path_normalized: { type: 'keyword' },
              status_code: { type: 'integer' },
              status_class: { type: 'keyword' },
              execution_time: { type: 'integer' },
              user_id: { type: 'keyword' },
              request_id: { type: 'keyword' },
              correlation_id: { type: 'keyword' },
              ip_address: { type: 'ip' },
              user_agent: { type: 'text' },
              is_error: { type: 'boolean' },
              is_slow: { type: 'boolean' },
              host: { type: 'keyword' },
              pid: { type: 'integer' }
            }
          }
        }
      })

      // Application logs template
      await this.elasticSearch.indices.putIndexTemplate({
        name: 'application-logs-template',
        index_patterns: ['application-logs-*'],
        template: {
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              log_type: { type: 'keyword' },
              level: { type: 'keyword' },
              level_numeric: { type: 'integer' },
              context: { type: 'keyword' },
              message: { type: 'text' },
              'error.name': { type: 'keyword' },
              'error.message': { type: 'text' },
              'error.stack': { type: 'text' },
              correlation_id: { type: 'keyword' },
              environment: { type: 'keyword' },
              has_error: { type: 'boolean' },
              is_critical: { type: 'boolean' },
              host: { type: 'keyword' },
              pid: { type: 'integer' }
            }
          }
        }
      })

      // Database logs template
      await this.elasticSearch.indices.putIndexTemplate({
        name: 'database-logs-template',
        index_patterns: ['database-logs-*'],
        template: {
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              log_type: { type: 'keyword' },
              query: { type: 'text' },
              'error.name': { type: 'keyword' },
              'error.message': { type: 'text' },
              'error.stack': { type: 'text' },
              correlation_id: { type: 'keyword' },
              environment: { type: 'keyword' },
              has_error: { type: 'boolean' },
              has_query: { type: 'boolean' },
              host: { type: 'keyword' },
              pid: { type: 'integer' }
            }
          }
        }
      })

      this.logger.log('Elasticsearch index templates created successfully')
    } catch (error) {
      this.logger.error('Failed to create Elasticsearch index templates', error)
    }
  }
}

export enum LogQueueJobName {
  HTTP_REQUEST = "HTTP_REQUEST",
  APPLICATION = "APPLICATION",
  DATABASE = "DATABASE",
}

export interface ErrorLog {
  name: string
  message: string
  stack: string
}

export interface HttpRequestLog {
  timestamp: string
  method: RequestMethod
  path: string
  statusCode: HttpStatus
  executionTime: number
  userId?: string
  requestId: string
  correlationId: string
  ipAddress: string
  userAgent?: string
  referer: string
  origin: string
  acceptLanguage: string
  pid: number
  host: string
}

export interface ApplicationLog {
  timestamp: string
  level: LogLevel
  context: string
  message: string
  error?: ErrorLog
  correlationId?: string
  environment: NodeEnv
  pid: number
  host: string
  args: any[]
}

export interface DatabaseLog {
  timestamp: string
  message?: string
  query?: string
  error?: ErrorLog
  correlationId?: string
  environment: NodeEnv
  pid: number
  host: string
  metadata?: Record<string, any>
}

export type LogConsumerData = ApplicationLog | HttpRequestLog | DatabaseLog
