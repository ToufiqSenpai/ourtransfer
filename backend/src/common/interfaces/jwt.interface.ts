export const JWT = Symbol('JWT')

export interface Jwt {
  signAccessToken(userId: string): Promise<string>
  verifyAccessToken(token: string): Promise<string | null>
}
