import { sign, verify } from 'jsonwebtoken'
import { Jwt } from '../../common/interfaces/jwt/jwt.interface'
import { ConfigService } from '@nestjs/config'
import { SecretManager } from '../../common/abstracts/secret-manager.abstract'

export const ACCESS_TOKEN_JWT = Symbol('ACCESS_TOKEN_JWT')

export class AccessTokenJwt implements Jwt {
  private readonly JWT_ISSUER = 'ourtransfer-client'

  public constructor(
    private readonly config: ConfigService,
    private readonly secretManager: SecretManager,
  ) {}

  public async sign(userId: string): Promise<string> {
    const secret = await this.secretManager.getOrThrow('ACCESS_TOKEN_SECRET')

    return sign({ sub: userId }, secret, {
      algorithm: 'HS256',
      issuer: this.config.get('app.domain'),
      audience: this.JWT_ISSUER,
      expiresIn: '1h',
    })
  }

  public async verify(token: string): Promise<string | null> {
    const payload = verify(token, await this.secretManager.getOrThrow('ACCESS_TOKEN_SECRET'), {
      algorithms: ['HS256'],
      issuer: this.config.get('app.domain'),
      audience: this.JWT_ISSUER,
    })

    if (typeof payload === 'string') {
      return null
    }

    if (typeof payload === 'object' && payload.sub) {
      return payload.sub
    }

    return null
  }
}
