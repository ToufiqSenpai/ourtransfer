export const HASHER = Symbol('Hasher')

export interface Hasher {
  hash(text: string): Promise<string>
  compare(text: string, hashedText: string): Promise<boolean>
}
