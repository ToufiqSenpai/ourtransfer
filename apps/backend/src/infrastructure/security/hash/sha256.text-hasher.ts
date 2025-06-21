import { TextHasher } from '../../../common/interfaces/security/hash/text-hasher.interface'
import { createHash } from 'crypto'

export class Sha256TextHasher implements TextHasher {
  public hash(text: string): Promise<string> {
    const hashedText = createHash('sha256').update(text).digest('hex')
    return Promise.resolve(hashedText)
  }

  public compare(text: string, hashedText: string): Promise<boolean> {
    return this.hash(text).then(hashed => hashed === hashedText)
  }
}
