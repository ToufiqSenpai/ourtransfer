import { PasswordHasher } from '../../../common/interfaces/security/hash/password-hasher.interface'
import { Injectable } from '@nestjs/common'
import { Algorithm, hash, verify } from '@node-rs/argon2'
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Argon2idPasswordHasher implements PasswordHasher {
  public constructor(private readonly config: ConfigService) {}

  public async hash(password: string): Promise<string> {
    return await hash(password, {
      memoryCost: this.config.get('password.argon2.memoryCost'),
      timeCost: this.config.get('password.argon2.iterations'),
      parallelism: this.config.get('password.argon2.parallelism'),
      outputLen: this.config.get('password.argon2.hashLength'),
      algorithm: Algorithm.Argon2id,
    })
  }

  public async compare(password: string, hashedPassword: string): Promise<boolean> {
    return await verify(hashedPassword, password, {
      algorithm: Algorithm.Argon2id,
    })
  }
}
