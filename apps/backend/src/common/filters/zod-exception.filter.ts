import { Catch, ExceptionFilter, ArgumentsHost } from "@nestjs/common"
import { ZodError } from "zod"
import { Response } from "express"

@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  public catch(exception: ZodError, host: ArgumentsHost): void {
    const context = host.switchToHttp()
    const res = context.getResponse<Response>()

    res.status(400).json({
      message: "Bad Request.",
      errors: exception.formErrors.fieldErrors,
    })
  }
}
