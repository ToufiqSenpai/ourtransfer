import { Catch, ExceptionFilter, ArgumentsHost } from '@nestjs/common'
import { ZodError } from 'zod'

@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  public catch(exception: ZodError, host: ArgumentsHost): void {
    const context = host.switchToHttp()
    const res = context.getResponse()

    res.status(400).json({
      message: 'Bad Request.',
      errors: exception.formErrors.fieldErrors,
    })
  }
}
