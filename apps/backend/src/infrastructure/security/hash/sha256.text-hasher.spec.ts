import { Sha256TextHasher } from "./sha256.text-hasher"
import { createHash } from "crypto"

describe("Sha256TextHasher", () => {
  let textHasher: Sha256TextHasher

  beforeEach(() => {
    textHasher = new Sha256TextHasher()
  })

  describe("hash", () => {
    it("should return a promise that resolves to a string", async () => {
      const text = "testPassword"
      const hashedTextPromise = textHasher.hash(text)
      expect(hashedTextPromise).toBeInstanceOf(Promise)
      const hashedText = await hashedTextPromise
      expect(typeof hashedText).toBe("string")
    })

    it("should return a different string than the input", async () => {
      const text = "testPassword"
      const hashedText = await textHasher.hash(text)
      expect(hashedText).not.toBe(text)
    })

    it("should return a 64-character hex string", async () => {
      const text = "testPassword"
      const hashedText = await textHasher.hash(text)
      expect(hashedText).toMatch(/^[a-f0-9]{64}$/)
    })

    it("should produce the same hash for the same input", async () => {
      const text = "testPassword"
      const hashedText1 = await textHasher.hash(text)
      const hashedText2 = await textHasher.hash(text)
      expect(hashedText1).toBe(hashedText2)
    })

    it("should produce a different hash for a different input", async () => {
      const text1 = "testPassword1"
      const text2 = "testPassword2"
      const hashedText1 = await textHasher.hash(text1)
      const hashedText2 = await textHasher.hash(text2)
      expect(hashedText1).not.toBe(hashedText2)
    })

    it("should correctly hash an empty string", async () => {
      const text = ""
      const expectedHash = createHash("sha256").update(text).digest("hex")
      const hashedText = await textHasher.hash(text)
      expect(hashedText).toBe(expectedHash)
    })

    it("should correctly hash a long string", async () => {
      const text = "a".repeat(1000)
      const expectedHash = createHash("sha256").update(text).digest("hex")
      const hashedText = await textHasher.hash(text)
      expect(hashedText).toBe(expectedHash)
    })
  })

  describe("compare", () => {
    it("should return a promise that resolves to a boolean", async () => {
      const text = "testPassword"
      const hashedText = await textHasher.hash(text)
      const comparisonResultPromise = textHasher.compare(text, hashedText)
      expect(comparisonResultPromise).toBeInstanceOf(Promise)
      const comparisonResult = await comparisonResultPromise
      expect(typeof comparisonResult).toBe("boolean")
    })

    it("should return true if the text matches the hashed text", async () => {
      const text = "testPassword"
      const hashedText = await textHasher.hash(text)
      const comparisonResult = await textHasher.compare(text, hashedText)
      expect(comparisonResult).toBe(true)
    })

    it("should return false if the text does not match the hashed text", async () => {
      const text = "testPassword"
      const incorrectText = "wrongPassword"
      const hashedText = await textHasher.hash(text)
      const comparisonResult = await textHasher.compare(incorrectText, hashedText)
      expect(comparisonResult).toBe(false)
    })

    it("should return false if the hashed text is incorrect", async () => {
      const text = "testPassword"
      const incorrectHashedText = "invalidhash123"
      const comparisonResult = await textHasher.compare(text, incorrectHashedText)
      expect(comparisonResult).toBe(false)
    })

    it("should return true for an empty string if it matches its hash", async () => {
      const text = ""
      const hashedText = await textHasher.hash(text)
      const comparisonResult = await textHasher.compare(text, hashedText)
      expect(comparisonResult).toBe(true)
    })

    it("should return false for an empty string if compared with a hash of a non-empty string", async () => {
      const text = ""
      const otherHashedText = await textHasher.hash("notempty")
      const comparisonResult = await textHasher.compare(text, otherHashedText)
      expect(comparisonResult).toBe(false)
    })
  })
})
