export const JWT = Symbol('JWT')

export interface Jwt {
  sign(userId: string): Promise<string>
  verify(token: string): Promise<string | null>
}
