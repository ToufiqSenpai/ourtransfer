import { SecretNotFoundException } from '../../shared/exceptions/secret-not-found.exception'

export abstract class SecretManager {
  abstract get(key: string): Promise<string | null>

  public async getOrThrow(key: string): Promise<string> {
    const value = await this.get(key)

    if (value === null || value === undefined) {
      throw new SecretNotFoundException(key)
    }

    return value
  }
}
