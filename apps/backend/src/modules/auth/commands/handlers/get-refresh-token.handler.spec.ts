import { Test, TestingModule } from '@nestjs/testing'
import { UnauthorizedException } from '@nestjs/common'
import { faker } from '@faker-js/faker'
import { MockProxy, mock } from 'jest-mock-extended'

import { GetRefreshTokenHandler } from './get-refresh-token.handler'
import { GetRefreshTokenCommand } from '../get-refresh-token.command'
import { RefreshTokenService } from '../../services/refresh-token.service'
import { RefreshTokenRepository } from '../../repositories/refresh-token.repository'
import { ACCESS_TOKEN_JWT } from '../../../../infrastructure/security/jwt/access-token-jwt.interface'
import { Jwt } from '../../../../infrastructure/security/jwt/jwt.interface'
import { TokensDto } from '@ourtransfer/dto'
import { RefreshToken } from '../../entities/refresh-token.entity'
import { User } from '../../../user/entities/user.entity'

describe('GetRefreshTokenHandler', () => {
  let handler: GetRefreshTokenHandler
  let mockAccessTokenJwt: MockProxy<Jwt>
  let mockRefreshTokenService: MockProxy<RefreshTokenService>
  let mockRefreshTokenRepository: MockProxy<RefreshTokenRepository>

  beforeEach(async () => {
    mockAccessTokenJwt = mock<Jwt>()
    mockRefreshTokenService = mock<RefreshTokenService>()
    mockRefreshTokenRepository = mock<RefreshTokenRepository>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetRefreshTokenHandler,
        {
          provide: ACCESS_TOKEN_JWT,
          useValue: mockAccessTokenJwt,
        },
        {
          provide: RefreshTokenService,
          useValue: mockRefreshTokenService,
        },
        {
          provide: RefreshTokenRepository,
          useValue: mockRefreshTokenRepository,
        },
      ],
    }).compile()

    handler = module.get<GetRefreshTokenHandler>(GetRefreshTokenHandler)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    const createMockCommand = (): GetRefreshTokenCommand => {
      return new GetRefreshTokenCommand(
        faker.string.alphanumeric(64),
        faker.internet.userAgent(),
        faker.internet.ip()
      )
    }

    const createMockUser = (): User => {
      const user = new User()
      user.id = faker.string.uuid()
      user.name = faker.person.fullName()
      user.email = faker.internet.email()
      return user
    }

    const createMockRefreshToken = (user: User): RefreshToken => {
      const refreshToken = new RefreshToken()
      refreshToken.id = faker.string.uuid()
      refreshToken.user = user
      refreshToken.token = faker.string.alphanumeric(64)
      refreshToken.userAgent = faker.internet.userAgent()
      refreshToken.ipAddress = faker.internet.ip()
      refreshToken.revoked = false
      refreshToken.expiresAt = faker.date.future()
      return refreshToken
    }

    it('should return tokens when refresh token is valid', async () => {
      // Arrange
      const command = createMockCommand()
      const mockUser = createMockUser()
      const mockOldRefreshToken = createMockRefreshToken(mockUser)
      const mockNewRefreshToken = createMockRefreshToken(mockUser)
      const mockAccessToken = faker.string.alphanumeric(128)

      mockRefreshTokenService.verify.mockResolvedValue(true)
      mockRefreshTokenRepository.findByToken.mockResolvedValue(mockOldRefreshToken)
      mockRefreshTokenService.create.mockResolvedValue(mockNewRefreshToken)
      mockAccessTokenJwt.sign.mockResolvedValue(mockAccessToken)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(result).toBeInstanceOf(TokensDto)
      expect(result.accessToken).toBe(mockAccessToken)
      expect(result.refreshToken).toBe(mockNewRefreshToken.token)

      expect(mockRefreshTokenService.verify).toHaveBeenCalledWith(
        command.refreshToken,
        command.userAgent
      )
      expect(mockRefreshTokenRepository.findByToken).toHaveBeenCalledWith(command.refreshToken)
      expect(mockRefreshTokenService.create).toHaveBeenCalledWith(
        mockOldRefreshToken.user,
        command.userAgent,
        command.ipAddress
      )
      expect(mockAccessTokenJwt.sign).toHaveBeenCalledWith(mockOldRefreshToken.user.id)
    })

    it('should throw UnauthorizedException when refresh token verification fails', async () => {
      // Arrange
      const command = createMockCommand()

      mockRefreshTokenService.verify.mockResolvedValue(false)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        new UnauthorizedException({
          message: 'Invalid refresh token.',
        })
      )

      expect(mockRefreshTokenService.verify).toHaveBeenCalledWith(
        command.refreshToken,
        command.userAgent
      )
      expect(mockRefreshTokenRepository.findByToken).not.toHaveBeenCalled()
      expect(mockRefreshTokenService.create).not.toHaveBeenCalled()
      expect(mockAccessTokenJwt.sign).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedException when refresh token is not found in repository', async () => {
      // Arrange
      const command = createMockCommand()

      mockRefreshTokenService.verify.mockResolvedValue(true)
      mockRefreshTokenRepository.findByToken.mockResolvedValue(null)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        new UnauthorizedException({
          message: 'Invalid refresh token.',
        })
      )

      expect(mockRefreshTokenService.verify).toHaveBeenCalledWith(
        command.refreshToken,
        command.userAgent
      )
      expect(mockRefreshTokenRepository.findByToken).toHaveBeenCalledWith(command.refreshToken)
      expect(mockRefreshTokenService.create).not.toHaveBeenCalled()
      expect(mockAccessTokenJwt.sign).not.toHaveBeenCalled()
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      const command = createMockCommand()
      const errorMessage = 'Database connection failed'

      mockRefreshTokenService.verify.mockRejectedValue(new Error(errorMessage))

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(errorMessage)

      expect(mockRefreshTokenService.verify).toHaveBeenCalledWith(
        command.refreshToken,
        command.userAgent
      )
      expect(mockRefreshTokenRepository.findByToken).not.toHaveBeenCalled()
    })

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const command = createMockCommand()
      const errorMessage = 'Repository error'

      mockRefreshTokenService.verify.mockResolvedValue(true)
      mockRefreshTokenRepository.findByToken.mockRejectedValue(new Error(errorMessage))

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(errorMessage)

      expect(mockRefreshTokenService.verify).toHaveBeenCalledWith(
        command.refreshToken,
        command.userAgent
      )
      expect(mockRefreshTokenRepository.findByToken).toHaveBeenCalledWith(command.refreshToken)
      expect(mockRefreshTokenService.create).not.toHaveBeenCalled()
    })

    it('should handle JWT signing errors gracefully', async () => {
      // Arrange
      const command = createMockCommand()
      const mockUser = createMockUser()
      const mockOldRefreshToken = createMockRefreshToken(mockUser)
      const mockNewRefreshToken = createMockRefreshToken(mockUser)
      const errorMessage = 'JWT signing failed'

      mockRefreshTokenService.verify.mockResolvedValue(true)
      mockRefreshTokenRepository.findByToken.mockResolvedValue(mockOldRefreshToken)
      mockRefreshTokenService.create.mockResolvedValue(mockNewRefreshToken)
      mockAccessTokenJwt.sign.mockRejectedValue(new Error(errorMessage))

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(errorMessage)

      expect(mockRefreshTokenService.verify).toHaveBeenCalledWith(
        command.refreshToken,
        command.userAgent
      )
      expect(mockRefreshTokenRepository.findByToken).toHaveBeenCalledWith(command.refreshToken)
      expect(mockRefreshTokenService.create).toHaveBeenCalledWith(
        mockOldRefreshToken.user,
        command.userAgent,
        command.ipAddress
      )
      expect(mockAccessTokenJwt.sign).toHaveBeenCalledWith(mockOldRefreshToken.user.id)
    })

    it('should handle refresh token creation errors gracefully', async () => {
      // Arrange
      const command = createMockCommand()
      const mockUser = createMockUser()
      const mockOldRefreshToken = createMockRefreshToken(mockUser)
      const errorMessage = 'Failed to create refresh token'

      mockRefreshTokenService.verify.mockResolvedValue(true)
      mockRefreshTokenRepository.findByToken.mockResolvedValue(mockOldRefreshToken)
      mockRefreshTokenService.create.mockRejectedValue(new Error(errorMessage))

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(errorMessage)

      expect(mockRefreshTokenService.verify).toHaveBeenCalledWith(
        command.refreshToken,
        command.userAgent
      )
      expect(mockRefreshTokenRepository.findByToken).toHaveBeenCalledWith(command.refreshToken)
      expect(mockRefreshTokenService.create).toHaveBeenCalledWith(
        mockOldRefreshToken.user,
        command.userAgent,
        command.ipAddress
      )
      expect(mockAccessTokenJwt.sign).not.toHaveBeenCalled()
    })
  })
})
