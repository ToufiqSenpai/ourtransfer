import Transport from 'winston-transport'
import { Queue } from 'bullmq'
import { ApplicationLog, LogQueueJobName } from './log.consumer'
import { HttpRequestContext } from '../../common/http/http-request.context'
import { hostname } from 'os'
import { NodeEnv } from '@ourtransfer/common'

export interface ElasticSearchTransportOptions extends Transport.TransportStreamOptions {
  logQueue: Queue<ApplicationLog>
  context: string
  httpRequestContext: HttpRequestContext
}

export class ElasticSearchTransport extends Transport {
  private readonly logQueue: Queue<ApplicationLog>
  private readonly context: string
  private readonly httpRequestContext: HttpRequestContext

  public constructor(options: ElasticSearchTransportOptions) {
    super(options)

    this.logQueue = options.logQueue
    this.context = options.context
    this.httpRequestContext = options.httpRequestContext
  }

  public async log(info: any, callback: () => void): Promise<void> {
    setImmediate(() => {
      this.emit('logged', info)
    })

    const args: any[] = info[Symbol.for('splat')] || []
    const error = args.find(arg => arg instanceof Error)
    await this.logQueue.add(LogQueueJobName.APPLICATION, {
      timestamp: info.timestamp,
      args: args.filter(arg => !(arg instanceof Error)),
      context: this.context,
      environment: process.env.NODE_ENV as NodeEnv,
      host: hostname(),
      level: info.level,
      message: info.message,
      pid: process.pid,
      correlationId: this.httpRequestContext.get()?.correlationId,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack || '',
      } : undefined,
    })

    callback()
  }
}
