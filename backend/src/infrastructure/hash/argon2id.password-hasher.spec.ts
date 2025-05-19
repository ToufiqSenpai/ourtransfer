import { Argon2idPasswordHasher } from './argon2id.password-hasher'
import { Algorithm, hash, verify } from '@node-rs/argon2'

jest.mock('@node-rs/argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
  Algorithm: {
    Argon2id: 'Argon2id',
  },
}))

describe('Argon2idPasswordHasher', () => {
  let passwordHasher: Argon2idPasswordHasher

  beforeEach(() => {
    passwordHasher = new Argon2idPasswordHasher()
  })

  describe('hash', () => {
    it('should hash the password with the correct options', async () => {
      const password = 'testPassword'
      const hashedPassword = 'hashedPassword123'

      ;(hash as jest.Mock).mockResolvedValue(hashedPassword)

      const result = await passwordHasher.hash(password)

      expect(hash).toHaveBeenCalledWith(password, {
        memoryCost: 8 * 1024,
        timeCost: 4,
        parallelism: 4,
        outputLen: 32,
        algorithm: Algorithm.Argon2id,
      })
      expect(result).toBe(hashedPassword)
    })
  })

  describe('compare', () => {
    it('should return true if the password matches the hashed password', async () => {
      const password = 'testPassword'
      const hashedPassword = 'hashedPassword123'

      ;(verify as jest.Mock).mockResolvedValue(true)

      const result = await passwordHasher.compare(password, hashedPassword)

      expect(verify).toHaveBeenCalledWith(hashedPassword, password, {
        algorithm: Algorithm.Argon2id,
      })
      expect(result).toBe(true)
    })

    it('should return false if the password does not match the hashed password', async () => {
      const password = 'testPassword'
      const hashedPassword = 'hashedPassword123'

      ;(verify as jest.Mock).mockResolvedValue(false)

      const result = await passwordHasher.compare(password, hashedPassword)

      expect(verify).toHaveBeenCalledWith(hashedPassword, password, {
        algorithm: Algorithm.Argon2id,
      })
      expect(result).toBe(false)
    })
  })
})
