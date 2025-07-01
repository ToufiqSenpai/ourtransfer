import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common"
import { HttpAdapterHost } from "@nestjs/core"
import { Response } from "express"

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  public constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  public catch(exception: Error, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost
    const ctx = host.switchToHttp()

    if (ctx.getResponse<Response>().headersSent) return

    let httpStatus: HttpStatus = exception instanceof HttpException ? exception.getStatus() : 500
    let responseBody: any

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus()
      responseBody = exception.getResponse()
    } else {
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR
      responseBody = {
        status: httpStatus,
        message: exception.message,
        timestamp: new Date().toISOString(),
        path: httpAdapter.getRequestUrl(ctx.getRequest()),
        trace: exception.stack,
      }
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus)
  }
}
