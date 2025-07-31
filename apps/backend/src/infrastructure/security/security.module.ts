import { Global, Module } from '@nestjs/common';
import { PASSWORD_HASHER } from './hash/password-hasher.interface';
import { Argon2idPasswordHasher } from './hash/argon2id.password-hasher';
import { TEXT_HASHER } from './hash/text-hasher.interface';
import { Sha256TextHasher } from './hash/sha256.text-hasher';
import { AccessTokenJwtImpl } from './jwt/access-token.jwt.impl';
import { ACCESS_TOKEN_JWT } from './jwt/access-token-jwt.interface';

@Global()
@Module({
  providers: [
    {
      provide: PASSWORD_HASHER,
      useClass: Argon2idPasswordHasher
    },
    {
      provide: TEXT_HASHER,
      useClass: Sha256TextHasher
    },
    {
      provide: ACCESS_TOKEN_JWT,
      useClass: AccessTokenJwtImpl
    }
  ],
  exports: [
    PASSWORD_HASHER,
    TEXT_HASHER,
    ACCESS_TOKEN_JWT,
  ]
})
export class SecurityModule {}
