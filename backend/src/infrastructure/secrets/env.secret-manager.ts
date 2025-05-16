import { Injectable } from '@nestjs/common'
import { SecretManager } from '../../common/abstracts/secret-manager.abstract'
import { config } from 'dotenv'
import { resolve } from 'path'

@Injectable()
export class EnvSecretManager extends SecretManager {
  public constructor() {
    super()

    config({ path: resolve(process.cwd(), '.env') })
    config({ path: resolve(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`), override: true })
  }

  public get(key: string): Promise<string | null> {
    return Promise.resolve(process.env[key] || null)
  }
}
