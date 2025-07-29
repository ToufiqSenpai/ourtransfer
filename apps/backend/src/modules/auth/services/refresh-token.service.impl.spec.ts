import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { RefreshTokenServiceImpl } from './refresh-token.service.impl'
import { mock, MockProxy } from 'jest-mock-extended'
import { faker } from '@faker-js/faker'
import { plainToInstance } from 'class-transformer'
import { TEXT_HASHER, TextHasher } from '../../../infrastructure/security/hash/text-hasher.interface'
import { RefreshTokenRepository } from '../repositories/refresh-token.repository'
import { RefreshToken } from '../entities/refresh-token.entity'
import { User } from '../../user/entities/user.entity'
import * as crypto from 'crypto'
import * as useragent from 'useragent'

// Mock crypto module while preserving other functions for NestJS compatibility
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn(),
}))
jest.mock('useragent')

describe('RefreshTokenServiceImpl', () => {
  let service: RefreshTokenServiceImpl
  let textHasher: MockProxy<TextHasher>
  let configService: MockProxy<ConfigService>
  let refreshTokenRepository: MockProxy<RefreshTokenRepository>
  let mockedUseragent: jest.Mocked<typeof useragent>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RefreshTokenServiceImpl,
        {
          provide: TEXT_HASHER,
          useValue: mock<TextHasher>(),
        },
        {
          provide: ConfigService,
          useValue: mock<ConfigService>(),
        },
        {
          provide: RefreshTokenRepository,
          useValue: mock<RefreshTokenRepository>(),
        },
      ],
    }).compile()

    service = module.get(RefreshTokenServiceImpl)
    textHasher = module.get(TEXT_HASHER)
    configService = module.get(ConfigService)
    refreshTokenRepository = module.get(RefreshTokenRepository)
    mockedUseragent = useragent as jest.Mocked<typeof useragent>
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    const mockUser = plainToInstance(User, {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      lastSignInAt: faker.date.past(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      updateLastSignInAt: jest.fn(),
    })

    const mockUserAgent = faker.internet.userAgent()
    const mockIpAddress = faker.internet.ip()
    const mockBytesLength = 32
    const mockExpiresIn = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    const mockRandomBytes = Buffer.from(faker.string.alphanumeric(64), 'utf8')
    const mockHashedToken = faker.string.alphanumeric(128)

    beforeEach(() => {
      configService.getOrThrow.mockImplementation((key: string) => {
        if (key === 'refreshToken.bytesLength') return mockBytesLength
        if (key === 'refreshToken.expiresIn') return mockExpiresIn
        return null
      })

      // eslint-disable-next-line @typescript-eslint/naming-convention
      jest.spyOn(crypto, 'randomBytes').mockImplementation((_: number) => mockRandomBytes)
      textHasher.hash.mockResolvedValue(mockHashedToken)
    })

    it('should create a refresh token successfully', async () => {
      // Arrange
      const expectedRefreshToken = plainToInstance(RefreshToken, {
        id: faker.string.uuid(),
        user: mockUser,
        token: mockHashedToken,
        userAgent: mockUserAgent,
        ipAddress: mockIpAddress,
        revoked: false,
        revokedAt: null,
        expiresAt: new Date(Date.now() + mockExpiresIn),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        revoke: jest.fn(),
      })

      // Mock the repository save method to return the expected token
      refreshTokenRepository.save.mockResolvedValue(expectedRefreshToken)

      // Act
      const result = await service.create(mockUser, mockUserAgent, mockIpAddress)

      // Assert
      expect(configService.getOrThrow).toHaveBeenCalledWith('refreshToken.bytesLength')
      expect(configService.getOrThrow).toHaveBeenCalledWith('refreshToken.expiresIn')
      expect(crypto.randomBytes).toHaveBeenCalledWith(mockBytesLength)
      expect(textHasher.hash).toHaveBeenCalledWith(mockRandomBytes.toString('hex'))

      // Verify that save was called with an object containing the expected properties
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          token: mockHashedToken,
          userAgent: mockUserAgent,
          ipAddress: mockIpAddress,
          expiresAt: expect.any(Date),
        })
      )
      expect(result).toBe(expectedRefreshToken)
    })

    it('should set correct expiration date', async () => {
      // Arrange
      const mockNow = new Date('2025-01-01T00:00:00Z')
      const expectedExpiresAt = new Date(mockNow.getTime() + mockExpiresIn)
      jest.spyOn(Date, 'now').mockReturnValue(mockNow.getTime())

      const createdRefreshToken = plainToInstance(RefreshToken, {
        id: faker.string.uuid(),
        user: mockUser,
        token: mockHashedToken,
        userAgent: mockUserAgent,
        ipAddress: mockIpAddress,
        revoked: false,
        expiresAt: expectedExpiresAt,
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        revoke: jest.fn(),
      })

      refreshTokenRepository.save.mockResolvedValue(createdRefreshToken)

      // Act
      await service.create(mockUser, mockUserAgent, mockIpAddress)

      // Assert
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: expectedExpiresAt,
        })
      )
    })

    it('should propagate errors from textHasher', async () => {
      // Arrange
      const hashError = new Error('Hashing failed')
      textHasher.hash.mockRejectedValue(hashError)

      // Act & Assert
      await expect(service.create(mockUser, mockUserAgent, mockIpAddress)).rejects.toThrow(hashError)
    })

    it('should propagate errors from repository', async () => {
      // Arrange
      const repositoryError = new Error('Database error')
      refreshTokenRepository.save.mockRejectedValue(repositoryError)

      // Act & Assert
      await expect(service.create(mockUser, mockUserAgent, mockIpAddress)).rejects.toThrow(repositoryError)
    })

    it('should propagate errors from config service', async () => {
      // Arrange
      const configError = new Error('Config not found')
      configService.getOrThrow.mockImplementation(() => {
        throw configError
      })

      // Act & Assert
      await expect(service.create(mockUser, mockUserAgent, mockIpAddress)).rejects.toThrow(configError)
    })
  })

  describe('verify', () => {
    const mockToken = faker.string.alphanumeric(128)
    const mockUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    const mockStoredUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

    const mockParsedAgent = {
      family: 'Chrome',
      os: { toString: (): string => 'Windows 10' },
      device: { toString: (): string => 'Desktop' },
    }

    const mockParsedStoredAgent = {
      family: 'Chrome',
      os: { toString: (): string => 'Windows 10' },
      device: { toString: (): string => 'Desktop' },
    }

    beforeEach(() => {
      mockedUseragent.parse.mockImplementation((ua?: string): any => {
        if (ua === mockUserAgent) return mockParsedAgent as any
        if (ua === mockStoredUserAgent) return mockParsedStoredAgent as any
        return {} as any
      })
    })

    it('should return true for valid non-expired token with matching user agent', async () => {
      // Arrange
      const validRefreshToken = plainToInstance(RefreshToken, {
        id: faker.string.uuid(),
        token: mockToken,
        userAgent: mockStoredUserAgent,
        ipAddress: faker.internet.ip(),
        revoked: false,
        expiresAt: faker.date.future(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        revoke: jest.fn(),
      })

      refreshTokenRepository.findByToken.mockResolvedValue(validRefreshToken)

      // Act
      const result = await service.verify(mockToken, mockUserAgent)

      // Assert
      expect(refreshTokenRepository.findByToken).toHaveBeenCalledWith(mockToken)
      expect(mockedUseragent.parse).toHaveBeenCalledWith(mockUserAgent)
      expect(mockedUseragent.parse).toHaveBeenCalledWith(mockStoredUserAgent)
      expect(result).toBe(true)
    })

    it('should return false when token is not found', async () => {
      // Arrange
      refreshTokenRepository.findByToken.mockResolvedValue(null)

      // Act
      const result = await service.verify(mockToken, mockUserAgent)

      // Assert
      expect(refreshTokenRepository.findByToken).toHaveBeenCalledWith(mockToken)
      expect(result).toBe(false)
    })

    it('should return false when token is expired', async () => {
      // Arrange
      const expiredRefreshToken = plainToInstance(RefreshToken, {
        id: faker.string.uuid(),
        token: mockToken,
        userAgent: mockStoredUserAgent,
        revoked: false,
        expiresAt: faker.date.past(), // Expired token
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        revoke: jest.fn(),
      })

      refreshTokenRepository.findByToken.mockResolvedValue(expiredRefreshToken)

      // Act
      const result = await service.verify(mockToken, mockUserAgent)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false when token is revoked', async () => {
      // Arrange
      const revokedRefreshToken = plainToInstance(RefreshToken, {
        id: faker.string.uuid(),
        token: mockToken,
        userAgent: mockStoredUserAgent,
        revoked: true, // Revoked token
        expiresAt: faker.date.future(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        revoke: jest.fn(),
      })

      refreshTokenRepository.findByToken.mockResolvedValue(revokedRefreshToken)

      // Act
      const result = await service.verify(mockToken, mockUserAgent)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false when user agent family does not match', async () => {
      // Arrange
      const differentUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/89.0'
      const differentParsedAgent = {
        family: 'Firefox', // Different browser
        os: { toString: (): string => 'Windows 10' },
        device: { toString: (): string => 'Desktop' },
      }

      mockedUseragent.parse.mockImplementation((ua?: string): any => {
        if (ua === differentUserAgent) return differentParsedAgent as any
        if (ua === mockStoredUserAgent) return mockParsedStoredAgent as any
        return {} as any
      })

      const validRefreshToken = plainToInstance(RefreshToken, {
        id: faker.string.uuid(),
        token: mockToken,
        userAgent: mockStoredUserAgent,
        revoked: false,
        expiresAt: faker.date.future(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        revoke: jest.fn(),
      })

      refreshTokenRepository.findByToken.mockResolvedValue(validRefreshToken)

      // Act
      const result = await service.verify(mockToken, differentUserAgent)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false when user agent OS does not match', async () => {
      // Arrange
      const differentUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      const differentParsedAgent = {
        family: 'Chrome',
        os: { toString: (): string => 'macOS' }, // Different OS
        device: { toString: (): string => 'Desktop' },
      }

      mockedUseragent.parse.mockImplementation((ua?: string): any => {
        if (ua === differentUserAgent) return differentParsedAgent as any
        if (ua === mockStoredUserAgent) return mockParsedStoredAgent as any
        return {} as any
      })

      const validRefreshToken = plainToInstance(RefreshToken, {
        id: faker.string.uuid(),
        token: mockToken,
        userAgent: mockStoredUserAgent,
        revoked: false,
        expiresAt: faker.date.future(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        revoke: jest.fn(),
      })

      refreshTokenRepository.findByToken.mockResolvedValue(validRefreshToken)

      // Act
      const result = await service.verify(mockToken, differentUserAgent)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false when user agent device does not match', async () => {
      // Arrange
      const differentUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      const differentParsedAgent = {
        family: 'Chrome',
        os: { toString: (): string => 'Windows 10' },
        device: { toString: (): string => 'Mobile' }, // Different device
      }

      mockedUseragent.parse.mockImplementation((ua?: string): any => {
        if (ua === differentUserAgent) return differentParsedAgent as any
        if (ua === mockStoredUserAgent) return mockParsedStoredAgent as any
        return {} as any
      })

      const validRefreshToken = plainToInstance(RefreshToken, {
        id: faker.string.uuid(),
        token: mockToken,
        userAgent: mockStoredUserAgent,
        revoked: false,
        expiresAt: faker.date.future(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        revoke: jest.fn(),
      })

      refreshTokenRepository.findByToken.mockResolvedValue(validRefreshToken)

      // Act
      const result = await service.verify(mockToken, differentUserAgent)

      // Assert
      expect(result).toBe(false)
    })

    it('should return true when stored user agent is null', async () => {
      // Arrange
      const tokenWithoutUserAgent = plainToInstance(RefreshToken, {
        id: faker.string.uuid(),
        token: mockToken,
        userAgent: null, // No user agent stored
        revoked: false,
        expiresAt: faker.date.future(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        revoke: jest.fn(),
      })

      refreshTokenRepository.findByToken.mockResolvedValue(tokenWithoutUserAgent)

      // Act
      const result = await service.verify(mockToken, mockUserAgent)

      // Assert
      expect(result).toBe(true)
      expect(mockedUseragent.parse).not.toHaveBeenCalled()
    })

    it('should return true when provided user agent is null', async () => {
      // Arrange
      const validRefreshToken = plainToInstance(RefreshToken, {
        id: faker.string.uuid(),
        token: mockToken,
        userAgent: mockStoredUserAgent,
        revoked: false,
        expiresAt: faker.date.future(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        revoke: jest.fn(),
      })

      refreshTokenRepository.findByToken.mockResolvedValue(validRefreshToken)

      // Act
      const result = await service.verify(mockToken, null as any)

      // Assert
      expect(result).toBe(true)
      expect(mockedUseragent.parse).not.toHaveBeenCalled()
    })

    it('should propagate errors from repository', async () => {
      // Arrange
      const repositoryError = new Error('Database error')
      refreshTokenRepository.findByToken.mockRejectedValue(repositoryError)

      // Act & Assert
      await expect(service.verify(mockToken, mockUserAgent)).rejects.toThrow(repositoryError)
    })
  })
})
