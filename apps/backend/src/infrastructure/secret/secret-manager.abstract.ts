import { SecretNotFoundException } from "../../common/exceptions/secret-not-found.exception"

export abstract class SecretManager {
  public abstract get(key: string): Promise<string | null>

  public async getOrThrow(key: string): Promise<string> {
    const value = await this.get(key)

    if (value === null) {
      throw new SecretNotFoundException(key)
    }

    return value
  }
}
