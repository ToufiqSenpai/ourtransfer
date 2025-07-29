import { Module } from '@nestjs/common';
import { PASSWORD_HASHER } from './hash/password-hasher.interface';
import { Argon2idPasswordHasher } from './hash/argon2id.password-hasher';
import { TEXT_HASHER } from './hash/text-hasher.interface';
import { Sha256TextHasher } from './hash/sha256.text-hasher';
import { JWT } from './jwt/jwt.interface';
import { AccessTokenJwtImpl } from './jwt/access-token.jwt.impl';

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
      provide: JWT,
      useClass: AccessTokenJwtImpl
    }
  ]
})
export class SecurityModule {}
