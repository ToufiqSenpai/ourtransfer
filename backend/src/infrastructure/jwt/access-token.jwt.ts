import { jwtVerify, SignJWT } from 'jose'
import { Jwt } from '../../common/interfaces/jwt.interface'
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

    return await new SignJWT({ sub: userId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(this.config.get('app.domain')!)
      .setAudience(this.JWT_ISSUER)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(Buffer.from(secret, 'utf-8'))
  }

  public async verify(token: string): Promise<string | null> {
    const secret = await this.secretManager.getOrThrow('ACCESS_TOKEN_SECRET')
    const { payload } = await jwtVerify(token, Buffer.from(secret, 'utf-8'), {
      issuer: this.config.get('app.domain'),
      audience: this.JWT_ISSUER,
    })

    return payload.sub || null
  }
}
