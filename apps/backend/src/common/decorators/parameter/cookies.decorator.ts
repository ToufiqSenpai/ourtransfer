import { ExecutionContext, createParamDecorator } from '@nestjs/common'
import { Request } from 'express'

export const Cookies = createParamDecorator((data: string, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<Request>()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return data ? request.cookies?.[data] : request.cookies
})
