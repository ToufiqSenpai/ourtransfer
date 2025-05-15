import { SecretManager } from '../../common/interfaces/secret-manager.interface'

export class EnvSecretManager implements SecretManager {
  public get(key: string): Promise<string | null> {
    return process.env[key]
  }
}
