import { Catch, ExceptionFilter, ArgumentsHost } from '@nestjs/common'
import { ZodError } from 'zod'

@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  public catch(exception: ZodError, host: ArgumentsHost) {
    const context = host.switchToHttp()
    const res = context.getResponse()

    res.status(400).json({
      message: 'Validation Failed',
      errors: exception.formErrors.fieldErrors,
    })
  }
}
