import { Inject, Injectable, PipeTransform, Scope } from '@nestjs/common'
import { GetRefreshTokenDto } from '@ourtransfer/dto'
import { z } from 'zod'
import { plainToInstance } from 'class-transformer'
import { REQUEST } from '@nestjs/core'
import { Request } from 'express'
import { REFRESH_TOKEN_COOKIE_NAME } from '../constants/cookie-name.constant'

@Injectable({ scope: Scope.REQUEST })
export class GetRefreshTokenValidationPipe implements PipeTransform<object, GetRefreshTokenDto> {
  public constructor(@Inject(REQUEST) private readonly request: Request) {}

  public transform(value: object): GetRefreshTokenDto {
    let refreshTokenSchema: z.ZodString | z.ZodOptional<z.ZodString> = z.string({
      required_error: 'Refresh token is required when cookies are not set.',
      invalid_type_error: 'Refresh token must be a string.',
    })

    if (this.request.cookies[REFRESH_TOKEN_COOKIE_NAME]) {
      refreshTokenSchema = refreshTokenSchema.optional()
    }

    const schema = z.object({
      refreshToken: refreshTokenSchema,
    })

    return plainToInstance(GetRefreshTokenDto, schema.parse(value))
  }
}
