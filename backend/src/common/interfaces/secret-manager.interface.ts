export const SECRET_MANAGER = Symbol('SecretManager')

export interface SecretManager {
  get(key: string): Promise<string | null>
}
