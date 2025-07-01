export class SecretNotFoundException extends Error {
  public constructor(key: string) {
    super(`Secret not found: ${key}`)
    this.name = "SecretNotFoundException"
  }
}
