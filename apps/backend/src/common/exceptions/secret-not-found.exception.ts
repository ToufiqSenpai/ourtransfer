export class SecretNotFoundException extends Error {
  constructor(key: string) {
    super(`Secret not found: ${key}`)
    this.name = 'SecretNotFoundException'
  }
}
