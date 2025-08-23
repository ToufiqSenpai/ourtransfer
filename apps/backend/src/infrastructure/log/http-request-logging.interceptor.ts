import { CallHandler, ExecutionContext, Injectable, NestInterceptor, RequestMethod } from "@nestjs/common"
import { HttpRequestContext } from '../../common/http/http-request.context';
import { Observable, tap } from "rxjs";
import { InjectQueue } from "@nestjs/bullmq";
import { LOG_QUEUE, HttpRequestLog, LogQueueJobName } from "./log.consumer";
import { Queue } from "bullmq";
import { Request, Response } from 'express'
import { hostname } from "os";

@Injectable()
export class HttpRequestLoggingInterceptor implements NestInterceptor {
  public constructor(
    @InjectQueue(LOG_QUEUE) private readonly logQueue: Queue<HttpRequestLog>,
    private readonly httpRequestContext: HttpRequestContext
  ) {}

  public async intercept(context: ExecutionContext, next: CallHandler<any>): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>()
    const response = context.switchToHttp().getResponse<Response>()
    const now = Date.now()

    return next
    .handle()
    .pipe(
      tap(async () => {
        const data: HttpRequestLog = {
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - now,
          ipAddress: this.httpRequestContext.get()?.ip || '',
          method: RequestMethod[request.method.toUpperCase() as keyof typeof RequestMethod],
          path: request.path,
          requestId: this.httpRequestContext.get()?.requestId || '',
          userId: this.httpRequestContext.get()?.userId || '',
          userAgent: request.headers['user-agent'] as string || '',
          statusCode: response.statusCode,
          acceptLanguage: request.headers['accept-language'] as string || '',
          referer: request.headers['referer'] as string || '',
          origin: request.headers['origin'] as string || '',
          correlationId: this.httpRequestContext.get()?.correlationId || '',
          pid: process.pid,
          host: hostname(),
        }

        await this.logQueue.add(LogQueueJobName.HTTP_REQUEST, data)
      })
    )
  }
}
