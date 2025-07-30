import { Test } from '@nestjs/testing'
import { UnauthorizedException, ForbiddenException } from '@nestjs/common'
import { LoginHandler } from './login.handler'
import { LoginCommand } from '../login.command'
import { TokensDto, LoginDto } from '@ourtransfer/dto'
import { mock, MockProxy } from 'jest-mock-extended'
import { faker } from '@faker-js/faker'
import { plainToInstance } from 'class-transformer'
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from '../../../../infrastructure/security/hash/password-hasher.interface'
import { ACCESS_TOKEN_JWT } from '../../../../infrastructure/security/jwt/access-token-jwt.interface'
import { Jwt } from '../../../../infrastructure/security/jwt/jwt.interface'
import { REFRESH_TOKEN_SERVICE, RefreshTokenService } from '../../services/refresh-token.service'
import { UserRepository } from '../../../user/repositories/user.repository'
import { PasswordIdentity } from '../../entities/password-identity.entity'
import { User } from '../../../user/entities/user.entity'
import { RefreshToken } from '../../entities/refresh-token.entity'
import { AuthProvider } from '@ourtransfer/common'
import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm'
import { Logger, LOGGER } from '../../../../infrastructure/logger/logger.interface'

describe('LoginHandler', () => {
  let handler: LoginHandler
  let passwordHasher: MockProxy<PasswordHasher>
  let accessTokenJwt: MockProxy<Jwt>
  let refreshTokenService: MockProxy<RefreshTokenService>
  let userRepository: MockProxy<UserRepository>
  let dataSource: MockProxy<DataSource>
  let logger: MockProxy<Logger>
  let mockQueryBuilder: MockProxy<SelectQueryBuilder<User>>
  let mockEntityManager: MockProxy<EntityManager>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LoginHandler,
        {
          provide: PASSWORD_HASHER,
          useValue: mock<PasswordHasher>(),
        },
        {
          provide: ACCESS_TOKEN_JWT,
          useValue: mock<Jwt>(),
        },
        {
          provide: REFRESH_TOKEN_SERVICE,
          useValue: mock<RefreshTokenService>(),
        },
        {
          provide: UserRepository,
          useValue: mock<UserRepository>(),
        },
        {
          provide: DataSource,
          useValue: mock<DataSource>(),
        },
        {
          provide: LOGGER,
          useValue: mock<Logger>(),
        },
      ],
    }).compile()

    handler = module.get(LoginHandler)
    passwordHasher = module.get(PASSWORD_HASHER)
    accessTokenJwt = module.get(ACCESS_TOKEN_JWT)
    refreshTokenService = module.get(REFRESH_TOKEN_SERVICE)
    userRepository = module.get(UserRepository)
    dataSource = module.get(DataSource)
    logger = module.get(LOGGER)

    // Setup query builder mock
    mockQueryBuilder = mock<SelectQueryBuilder<User>>()
    mockEntityManager = mock<EntityManager>()

    userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
    mockQueryBuilder.leftJoinAndSelect.mockReturnValue(mockQueryBuilder)
    mockQueryBuilder.where.mockReturnValue(mockQueryBuilder)
    mockQueryBuilder.andWhere.mockReturnValue(mockQueryBuilder)

    // Setup transaction mock
    dataSource.transaction.mockImplementation(async (callback) => {
      if (typeof callback === 'function') {
        return await callback(mockEntityManager)
      }
      throw new Error('Invalid transaction callback')
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    const mockLoginDto: LoginDto = {
      email: faker.internet.email(),
      password: faker.internet.password(),
    }

    const mockUserAgent = faker.internet.userAgent()
    const mockIpAddress = faker.internet.ip()

    const mockPasswordIdentity = plainToInstance(PasswordIdentity, {
      id: faker.string.uuid(),
      email: mockLoginDto.email,
      passwordHash: faker.string.alphanumeric(60),
      authProvider: AuthProvider.EMAIL_PASSWORD,
      lastSignInAt: faker.date.past(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      updateLastSignInAt: jest.fn(),
    })

    const mockUser = plainToInstance(User, {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: mockLoginDto.email,
      lastSignInAt: faker.date.past(),
      identities: [mockPasswordIdentity],
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      updateLastSignInAt: jest.fn(),
    })

    // Set user reference in password identity
    mockPasswordIdentity.user = mockUser

    const mockAccessToken = faker.string.alphanumeric(128)
    const mockRefreshToken = plainToInstance(RefreshToken, {
      id: faker.string.uuid(),
      user: mockUser,
      token: faker.string.alphanumeric(64),
      userAgent: mockUserAgent,
      ipAddress: mockIpAddress,
      revoked: false,
      revokedAt: null,
      expiresAt: faker.date.future(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      revoke: jest.fn(),
    })

    // Helper function to create mock user with proper method
    const createMockUser = (overrides: Partial<User> = {}): User => {
      const baseUser = {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        lastSignInAt: mockUser.lastSignInAt,
        identities: mockUser.identities,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        updateLastSignInAt: jest.fn(),
        ...overrides,
      }
      return plainToInstance(User, baseUser)
    }

    let command: LoginCommand

    beforeEach(() => {
      command = new LoginCommand(mockLoginDto, mockUserAgent, mockIpAddress)
    })

    afterEach(() => {
      jest.resetAllMocks()
      jest.restoreAllMocks()
    })

    it('should successfully login and return tokens', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(mockUser)
      passwordHasher.compare.mockResolvedValue(true)
      accessTokenJwt.sign.mockResolvedValue(mockAccessToken)
      refreshTokenService.create.mockResolvedValue(mockRefreshToken)
      mockEntityManager.update.mockResolvedValue({} as any)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user')
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('user.identities', 'identity')
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.email = :email', { email: mockLoginDto.email })
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('identity.authProvider = :authProvider', {
        authProvider: AuthProvider.EMAIL_PASSWORD
      })
      expect(passwordHasher.compare).toHaveBeenCalledWith(mockLoginDto.password, mockPasswordIdentity.passwordHash)
      expect(accessTokenJwt.sign).toHaveBeenCalledWith(mockUser.id)
      expect(refreshTokenService.create).toHaveBeenCalledWith(mockUser, mockUserAgent, mockIpAddress)

      expect(dataSource.transaction).toHaveBeenCalled()
      expect(mockEntityManager.update).toHaveBeenCalledTimes(2)
      expect(mockEntityManager.update).toHaveBeenCalledWith(PasswordIdentity, mockPasswordIdentity.id, {
        lastSignInAt: expect.any(Date)
      })
      expect(mockEntityManager.update).toHaveBeenCalledWith(User, mockUser.id, {
        lastSignInAt: expect.any(Date)
      })

      expect(result).toBeInstanceOf(TokensDto)
      expect(result.accessToken).toBe(mockAccessToken)
      expect(result.refreshToken).toBe(mockRefreshToken.token)
    })

    it('should throw UnauthorizedException when user is not found', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(null)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException)
      await expect(handler.execute(command)).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            message: 'Email or password is incorrect.',
          })
        })
      )

      expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user')
      expect(passwordHasher.compare).not.toHaveBeenCalled()
      expect(accessTokenJwt.sign).not.toHaveBeenCalled()
      expect(refreshTokenService.create).not.toHaveBeenCalled()
      expect(dataSource.transaction).not.toHaveBeenCalled()
    })

    it('should throw ForbiddenException when user has no identities', async () => {
      // Arrange
      const userWithoutIdentities = createMockUser({ identities: [] })
      mockQueryBuilder.getOne.mockResolvedValue(userWithoutIdentities)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(ForbiddenException)
      await expect(handler.execute(command)).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            message: "Unsupported authentication method. Please use a different login method."
          })
        })
      )

      expect(passwordHasher.compare).not.toHaveBeenCalled()
      expect(accessTokenJwt.sign).not.toHaveBeenCalled()
      expect(refreshTokenService.create).not.toHaveBeenCalled()
      expect(dataSource.transaction).not.toHaveBeenCalled()
    })

    it('should throw ForbiddenException when user identities is undefined', async () => {
      // Arrange
      const userWithUndefinedIdentities = createMockUser({ identities: undefined })
      mockQueryBuilder.getOne.mockResolvedValue(userWithUndefinedIdentities)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(ForbiddenException)

      expect(passwordHasher.compare).not.toHaveBeenCalled()
      expect(accessTokenJwt.sign).not.toHaveBeenCalled()
      expect(refreshTokenService.create).not.toHaveBeenCalled()
      expect(dataSource.transaction).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedException when no PasswordIdentity found', async () => {
      // Arrange
      const userWithDifferentIdentity = createMockUser({
        identities: [{ authProvider: AuthProvider.GOOGLE } as any] // Not a PasswordIdentity
      })
      mockQueryBuilder.getOne.mockResolvedValue(userWithDifferentIdentity)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException)
      await expect(handler.execute(command)).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            message: 'Email or password is incorrect.',
          })
        })
      )

      expect(passwordHasher.compare).not.toHaveBeenCalled()
      expect(accessTokenJwt.sign).not.toHaveBeenCalled()
      expect(refreshTokenService.create).not.toHaveBeenCalled()
      expect(dataSource.transaction).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedException when password hash is empty', async () => {
      // Arrange
      const passwordIdentityWithEmptyHash = {
        id: mockPasswordIdentity.id,
        email: mockPasswordIdentity.email,
        passwordHash: '',
        authProvider: mockPasswordIdentity.authProvider,
        lastSignInAt: mockPasswordIdentity.lastSignInAt,
        createdAt: mockPasswordIdentity.createdAt,
        updatedAt: mockPasswordIdentity.updatedAt,
        updateLastSignInAt: jest.fn(),
      }
      const userWithEmptyPasswordHash = createMockUser({
        identities: [passwordIdentityWithEmptyHash as any]
      })
      mockQueryBuilder.getOne.mockResolvedValue(userWithEmptyPasswordHash)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException)
      await expect(handler.execute(command)).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            message: 'Email or password is incorrect.',
          })
        })
      )

      expect(passwordHasher.compare).not.toHaveBeenCalled()
      expect(accessTokenJwt.sign).not.toHaveBeenCalled()
      expect(refreshTokenService.create).not.toHaveBeenCalled()
      expect(dataSource.transaction).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedException when password hash is null', async () => {
      // Arrange
      const passwordIdentityWithNullHash = {
        id: mockPasswordIdentity.id,
        email: mockPasswordIdentity.email,
        passwordHash: null,
        authProvider: mockPasswordIdentity.authProvider,
        lastSignInAt: mockPasswordIdentity.lastSignInAt,
        createdAt: mockPasswordIdentity.createdAt,
        updatedAt: mockPasswordIdentity.updatedAt,
        updateLastSignInAt: jest.fn(),
      }
      const userWithNullPasswordHash = createMockUser({
        identities: [passwordIdentityWithNullHash as any]
      })
      mockQueryBuilder.getOne.mockResolvedValue(userWithNullPasswordHash)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException)

      expect(passwordHasher.compare).not.toHaveBeenCalled()
      expect(accessTokenJwt.sign).not.toHaveBeenCalled()
      expect(refreshTokenService.create).not.toHaveBeenCalled()
      expect(dataSource.transaction).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedException when password comparison fails', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(mockUser)
      passwordHasher.compare.mockResolvedValue(false)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException)
      await expect(handler.execute(command)).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            message: 'Email or password is incorrect.',
          })
        })
      )

      expect(passwordHasher.compare).toHaveBeenCalledWith(mockLoginDto.password, mockPasswordIdentity.passwordHash)
      expect(accessTokenJwt.sign).not.toHaveBeenCalled()
      expect(refreshTokenService.create).not.toHaveBeenCalled()
      expect(dataSource.transaction).not.toHaveBeenCalled()
    })

    it('should continue login process even if timestamp update fails', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(mockUser)
      passwordHasher.compare.mockResolvedValue(true)
      accessTokenJwt.sign.mockResolvedValue(mockAccessToken)
      refreshTokenService.create.mockResolvedValue(mockRefreshToken)

      // Mock transaction to throw error
      const transactionError = new Error('Database connection failed')
      dataSource.transaction.mockRejectedValue(transactionError)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(result).toBeInstanceOf(TokensDto)
      expect(result.accessToken).toBe(mockAccessToken)
      expect(result.refreshToken).toBe(mockRefreshToken.token)

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to update last sign in timestamps',
        transactionError
      )
    })

    it('should call updateLastSignInAt methods before updating entities', async () => {
      // Arrange - Create spy on the actual objects that will be returned from query
      const userUpdateSpy = jest.spyOn(mockUser, 'updateLastSignInAt')

      // Ensure identities exist and get the first one
      if (!mockUser.identities || mockUser.identities.length === 0) {
        throw new Error('Mock user must have identities for this test')
      }
      const passwordIdentityUpdateSpy = jest.spyOn(mockUser.identities[0] as PasswordIdentity, 'updateLastSignInAt')

      mockQueryBuilder.getOne.mockResolvedValue(mockUser)
      passwordHasher.compare.mockResolvedValue(true)
      accessTokenJwt.sign.mockResolvedValue(mockAccessToken)
      refreshTokenService.create.mockResolvedValue(mockRefreshToken)
      mockEntityManager.update.mockResolvedValue({} as any)

      // Act
      await handler.execute(command)

      // Assert
      expect(passwordIdentityUpdateSpy).toHaveBeenCalledTimes(1)
      expect(userUpdateSpy).toHaveBeenCalledTimes(1)
      expect(dataSource.transaction).toHaveBeenCalled()

      // Cleanup spies
      passwordIdentityUpdateSpy.mockRestore()
      userUpdateSpy.mockRestore()
    })

    it('should use correct query parameters for user lookup', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(mockUser)
      passwordHasher.compare.mockResolvedValue(true)
      accessTokenJwt.sign.mockResolvedValue(mockAccessToken)
      refreshTokenService.create.mockResolvedValue(mockRefreshToken)

      // Act
      await handler.execute(command)

      // Assert
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.email = :email', {
        email: mockLoginDto.email
      })
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('identity.authProvider = :authProvider', {
        authProvider: AuthProvider.EMAIL_PASSWORD
      })
    })
  })
})
