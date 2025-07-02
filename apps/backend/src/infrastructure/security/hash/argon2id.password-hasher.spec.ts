import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { Argon2idPasswordHasher } from './argon2id.password-hasher'
import { mock, MockProxy } from 'jest-mock-extended'
import { faker } from '@faker-js/faker'
import * as argon2 from '@node-rs/argon2'

// Mock the @node-rs/argon2 module
jest.mock('@node-rs/argon2', () => ({
  Algorithm: {
    Argon2id: 'argon2id',
  },
  hash: jest.fn(),
  verify: jest.fn(),
}))

describe('Argon2idPasswordHasher', () => {
  let passwordHasher: Argon2idPasswordHasher
  let configService: MockProxy<ConfigService>
  let mockedArgon2: jest.Mocked<typeof argon2>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        Argon2idPasswordHasher,
        {
          provide: ConfigService,
          useValue: mock<ConfigService>(),
        },
      ],
    }).compile()

    passwordHasher = module.get(Argon2idPasswordHasher)
    configService = module.get(ConfigService)
    mockedArgon2 = argon2 as jest.Mocked<typeof argon2>

    // Setup default config values
    // @ts-ignore
    configService.get.calledWith('password.argon2.memoryCost').mockReturnValue(8192)
    // @ts-ignore
    configService.get.calledWith('password.argon2.iterations').mockReturnValue(3)
    // @ts-ignore
    configService.get.calledWith('password.argon2.parallelism').mockReturnValue(2)
    // @ts-ignore
    configService.get.calledWith('password.argon2.hashLength').mockReturnValue(32)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(passwordHasher).toBeDefined()
  })

  describe('hash', () => {
    it('should hash a password using Argon2id with correct configuration', async () => {
      const password = faker.internet.password()
      const expectedHash = faker.string.alphanumeric(64)

      mockedArgon2.hash.mockResolvedValue(expectedHash)

      const result = await passwordHasher.hash(password)

      expect(mockedArgon2.hash).toHaveBeenCalledWith(password, {
        memoryCost: 8192,
        timeCost: 3,
        parallelism: 2,
        outputLen: 32,
        algorithm: argon2.Algorithm.Argon2id,
      })
      expect(result).toBe(expectedHash)
    })

    it('should use configuration values from ConfigService', async () => {
      const password = faker.internet.password()
      const customConfig = {
        memoryCost: 16384,
        iterations: 5,
        parallelism: 4,
        hashLength: 64,
      }

      // @ts-ignore
      configService.get.calledWith('password.argon2.memoryCost').mockReturnValue(customConfig.memoryCost)
      // @ts-ignore
      configService.get.calledWith('password.argon2.iterations').mockReturnValue(customConfig.iterations)
      // @ts-ignore
      configService.get.calledWith('password.argon2.parallelism').mockReturnValue(customConfig.parallelism)
      // @ts-ignore
      configService.get.calledWith('password.argon2.hashLength').mockReturnValue(customConfig.hashLength)

      mockedArgon2.hash.mockResolvedValue(faker.string.alphanumeric(64))

      await passwordHasher.hash(password)

      expect(mockedArgon2.hash).toHaveBeenCalledWith(password, {
        memoryCost: customConfig.memoryCost,
        timeCost: customConfig.iterations,
        parallelism: customConfig.parallelism,
        outputLen: customConfig.hashLength,
        algorithm: argon2.Algorithm.Argon2id,
      })
    })

    it('should handle different password lengths', async () => {
      const passwords = [
        faker.internet.password({ length: 6 }),
        faker.internet.password({ length: 20 }),
        faker.internet.password({ length: 100 }),
      ]

      for (const password of passwords) {
        const expectedHash = faker.string.alphanumeric(64)
        mockedArgon2.hash.mockResolvedValue(expectedHash)

        const result = await passwordHasher.hash(password)

        expect(mockedArgon2.hash).toHaveBeenCalledWith(password, expect.any(Object))
        expect(result).toBe(expectedHash)
      }
    })

    it('should handle special characters in password', async () => {
      const password = 'P@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?'
      const expectedHash = faker.string.alphanumeric(64)

      mockedArgon2.hash.mockResolvedValue(expectedHash)

      const result = await passwordHasher.hash(password)

      expect(mockedArgon2.hash).toHaveBeenCalledWith(password, expect.any(Object))
      expect(result).toBe(expectedHash)
    })

    it('should propagate errors from argon2.hash', async () => {
      const password = faker.internet.password()
      const error = new Error('Hashing failed')

      mockedArgon2.hash.mockRejectedValue(error)

      await expect(passwordHasher.hash(password)).rejects.toThrow('Hashing failed')
    })
  })

  describe('compare', () => {
    it('should verify a password against its hash and return true for matching password', async () => {
      const password = faker.internet.password()
      const hashedPassword = faker.string.alphanumeric(64)

      mockedArgon2.verify.mockResolvedValue(true)

      const result = await passwordHasher.compare(password, hashedPassword)

      expect(mockedArgon2.verify).toHaveBeenCalledWith(hashedPassword, password, {
        algorithm: argon2.Algorithm.Argon2id,
      })
      expect(result).toBe(true)
    })

    it('should verify a password against its hash and return false for non-matching password', async () => {
      const wrongPassword = faker.internet.password()
      const hashedPassword = faker.string.alphanumeric(64)

      mockedArgon2.verify.mockResolvedValue(false)

      const result = await passwordHasher.compare(wrongPassword, hashedPassword)

      expect(mockedArgon2.verify).toHaveBeenCalledWith(hashedPassword, wrongPassword, {
        algorithm: argon2.Algorithm.Argon2id,
      })
      expect(result).toBe(false)
    })

    it('should handle empty password strings', async () => {
      const password = ''
      const hashedPassword = faker.string.alphanumeric(64)

      mockedArgon2.verify.mockResolvedValue(false)

      const result = await passwordHasher.compare(password, hashedPassword)

      expect(mockedArgon2.verify).toHaveBeenCalledWith(hashedPassword, password, {
        algorithm: argon2.Algorithm.Argon2id,
      })
      expect(result).toBe(false)
    })

    it('should handle invalid hash format', async () => {
      const password = faker.internet.password()
      const invalidHash = 'invalid-hash'

      mockedArgon2.verify.mockResolvedValue(false)

      const result = await passwordHasher.compare(password, invalidHash)

      expect(mockedArgon2.verify).toHaveBeenCalledWith(invalidHash, password, {
        algorithm: argon2.Algorithm.Argon2id,
      })
      expect(result).toBe(false)
    })

    it('should propagate errors from argon2.verify', async () => {
      const password = faker.internet.password()
      const hashedPassword = faker.string.alphanumeric(64)
      const error = new Error('Verification failed')

      mockedArgon2.verify.mockRejectedValue(error)

      await expect(passwordHasher.compare(password, hashedPassword)).rejects.toThrow('Verification failed')
    })

    it('should handle special characters in password comparison', async () => {
      const password = 'P@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?'
      const hashedPassword = faker.string.alphanumeric(64)

      mockedArgon2.verify.mockResolvedValue(true)

      const result = await passwordHasher.compare(password, hashedPassword)

      expect(mockedArgon2.verify).toHaveBeenCalledWith(hashedPassword, password, {
        algorithm: argon2.Algorithm.Argon2id,
      })
      expect(result).toBe(true)
    })
  })

  describe('integration scenarios', () => {
    it('should maintain consistency between hash and compare operations', async () => {
      const password = faker.internet.password()
      const hashedPassword = faker.string.alphanumeric(64)

      // Hash operation
      mockedArgon2.hash.mockResolvedValue(hashedPassword)
      const hashResult = await passwordHasher.hash(password)

      // Compare operation
      mockedArgon2.verify.mockResolvedValue(true)
      const compareResult = await passwordHasher.compare(password, hashResult)

      expect(hashResult).toBe(hashedPassword)
      expect(compareResult).toBe(true)
      expect(mockedArgon2.hash).toHaveBeenCalledWith(password, expect.objectContaining({
        algorithm: argon2.Algorithm.Argon2id,
      }))
      expect(mockedArgon2.verify).toHaveBeenCalledWith(hashResult, password, {
        algorithm: argon2.Algorithm.Argon2id,
      })
    })
  })
})
