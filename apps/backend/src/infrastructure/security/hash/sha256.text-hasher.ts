import { TextHasher } from "./text-hasher.interface"
import { createHash } from "crypto"

export class Sha256TextHasher implements TextHasher {
  public hash(text: string): Promise<string> {
    const hashedText = createHash("sha256").update(text).digest("hex")
    return Promise.resolve(hashedText)
  }

  public async compare(text: string, hashedText: string): Promise<boolean> {
    const hashed = await this.hash(text)
    return hashed === hashedText
  }
}
