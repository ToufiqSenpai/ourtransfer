import { ExecutionContext, createParamDecorator } from "@nestjs/common"
import { Request } from "express"

export const Cookies = createParamDecorator((data: string, context: ExecutionContext): string => {
  const request = context.switchToHttp().getRequest<Request>()
  return data ? request.cookies[data] : request.cookies
})
