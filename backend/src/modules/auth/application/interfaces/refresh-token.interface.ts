export interface RefreshToken {
  create(): Promise<string>
}
