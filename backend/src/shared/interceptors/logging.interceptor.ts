import { NestInterceptor, Injectable, ExecutionContext, CallHandler, Inject } from '@nestjs/common'
import { Observable, tap } from 'rxjs'
import { Logger, LOGGER } from '../../common/interfaces/logger.interface'
import { Request, Response } from 'express'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  public constructor(@Inject(LOGGER) private logger: Logger) {}

  public intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now()
    const req = context.switchToHttp().getRequest<Request>()

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse<Response>()
        this.logger.info(
          `[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${Date.now() - now}ms)`,
        )
      }),
    )
  }
}
