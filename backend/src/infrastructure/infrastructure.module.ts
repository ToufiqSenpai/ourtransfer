import { Global, Module } from '@nestjs/common'
import { LOGGER } from '../common/interfaces/logger.interface'
import { WinstonLogger } from './logger/winston.logger'
import { SecretManager } from '../common/abstracts/secret-manager.abstract'
import { EnvSecretManager } from './secrets/env.secret-manager'
import { PASSWORD_HASHER } from '../common/interfaces/hash/password-hasher.interface'
import { Argon2idPasswordHasher } from './hash/argon2id.password-hasher'
import { DatabaseModule } from './database/database.module'
import { ACCESS_TOKEN_JWT, AccessTokenJwt } from './jwt/access-token.jwt'

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: LOGGER,
      useClass: WinstonLogger,
    },
    {
      provide: SecretManager,
      useClass: EnvSecretManager,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: Argon2idPasswordHasher,
    },
    {
      provide: ACCESS_TOKEN_JWT,
      useClass: AccessTokenJwt,
    },
  ],
  exports: [
    {
      provide: LOGGER,
      useClass: WinstonLogger,
    },
    {
      provide: SecretManager,
      useClass: EnvSecretManager,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: Argon2idPasswordHasher,
    },
    {
      provide: ACCESS_TOKEN_JWT,
      useClass: AccessTokenJwt,
    },
  ],
})
export class InfrastructureModule {}
