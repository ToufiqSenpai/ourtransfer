import { createParamDecorator, ExecutionContext } from "@nestjs/common"

export const IpAddress = createParamDecorator((data: unknown, context: ExecutionContext) => {
  const req = context.switchToHttp().getRequest()
  return req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.socket.remoteAddress
})
