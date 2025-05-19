import { PasswordHasher } from '../../common/interfaces/hash/password-hasher.interface'
import { Injectable } from '@nestjs/common'
import { Algorithm, hash, verify } from '@node-rs/argon2'

@Injectable()
export class Argon2idPasswordHasher implements PasswordHasher {
  public async hash(password: string): Promise<string> {
    return await hash(password, {
      memoryCost: 8 * 1024,
      timeCost: 4,
      parallelism: 4,
      outputLen: 32,
      algorithm: Algorithm.Argon2id,
    })
  }

  public async compare(password: string, hashedPassword: string): Promise<boolean> {
    return await verify(hashedPassword, password, {
      algorithm: Algorithm.Argon2id,
    })
  }
}
