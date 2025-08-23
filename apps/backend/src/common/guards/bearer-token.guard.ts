import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { ACCESS_TOKEN_JWT, AccessTokenJwt } from '../../infrastructure/security/jwt/access-token-jwt.interface'
import { Request } from 'express'
import { plainToInstance } from 'class-transformer'
import { CommonResponseDto } from '@ourtransfer/dto'

declare global {
  namespace Express {
    interface Request {
      userId: string
    }
  }
}

@Injectable()
export class BearerTokenGuard implements CanActivate {
  public constructor(@Inject(ACCESS_TOKEN_JWT) private readonly accessToken: AccessTokenJwt) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    const authorizationHeader = request.headers.authorization

    try {
      if (!authorizationHeader) throw new BearerTokenException()

      const [scheme, token] = authorizationHeader.split(' ')

      if (scheme !== 'Bearer' || !token) throw new BearerTokenException()
      const userId = await this.accessToken.verify(token)

      if (!userId) throw new BearerTokenException()

      request.userId = userId

      return true
    } catch (error) {
      if (error instanceof BearerTokenException) {
        throw new UnauthorizedException(plainToInstance(CommonResponseDto, { message: error.message }))
      } else {
        throw error
      }
    }
  }
}

class BearerTokenException extends Error {
  public constructor() {
    super('Unauthorized.')
    this.name = 'BearerTokenException'
  }
}
