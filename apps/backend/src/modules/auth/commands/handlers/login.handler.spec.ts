import { Test } from '@nestjs/testing'
import { UnauthorizedException } from '@nestjs/common'
import { LoginHandler } from './login.handler'
import { LoginCommand } from '../login.command'
import { TokensDto, LoginDto, CommonResponseDto } from '@ourtransfer/dto'
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
import { PasswordIdentityRepository } from '../../repositories/password-identity.repository'
import { UserRepository } from '../../../user/repositories/user.repository'
import { PasswordIdentity } from '../../entities/password-identity.entity'
import { User } from '../../../user/entities/user.entity'
import { RefreshToken } from '../../entities/refresh-token.entity'
import { AuthProvider } from '@ourtransfer/common'

describe('LoginHandler', () => {
  let handler: LoginHandler
  let passwordHasher: MockProxy<PasswordHasher>
  let accessTokenJwt: MockProxy<Jwt>
  let refreshTokenService: MockProxy<RefreshTokenService>
  let passwordIdentityRepository: MockProxy<PasswordIdentityRepository>
  let userRepository: MockProxy<UserRepository>

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
          provide: PasswordIdentityRepository,
          useValue: mock<PasswordIdentityRepository>(),
        },
        {
          provide: UserRepository,
          useValue: mock<UserRepository>(),
        },
      ],
    }).compile()

    handler = module.get(LoginHandler)
    passwordHasher = module.get(PASSWORD_HASHER)
    accessTokenJwt = module.get(ACCESS_TOKEN_JWT)
    refreshTokenService = module.get(REFRESH_TOKEN_SERVICE)
    passwordIdentityRepository = module.get(PasswordIdentityRepository)
    userRepository = module.get(UserRepository)
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

    const mockUser = plainToInstance(User, {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: mockLoginDto.email,
      lastSignInAt: faker.date.past(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      updateLastSignInAt: jest.fn(),
    })

    const mockPasswordIdentity = plainToInstance(PasswordIdentity, {
      id: faker.string.uuid(),
      user: mockUser,
      email: mockLoginDto.email,
      passwordHash: faker.string.alphanumeric(60),
      authProvider: AuthProvider.EMAIL_PASSWORD,
      lastSignInAt: faker.date.past(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      updateLastSignInAt: jest.fn(),
    })

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
      passwordIdentityRepository.findByEmail.mockResolvedValue(mockPasswordIdentity)
      passwordHasher.compare.mockResolvedValue(true)
      accessTokenJwt.sign.mockResolvedValue(mockAccessToken)
      refreshTokenService.create.mockResolvedValue(mockRefreshToken)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(passwordIdentityRepository.findByEmail).toHaveBeenCalledWith(mockLoginDto.email)
      expect(passwordHasher.compare).toHaveBeenCalledWith(mockLoginDto.password, mockPasswordIdentity.passwordHash)
      expect(accessTokenJwt.sign).toHaveBeenCalledWith(mockUser.id)
      expect(refreshTokenService.create).toHaveBeenCalledWith(expect.any(User), mockUserAgent, mockIpAddress)

      expect(passwordIdentityRepository.update).toHaveBeenCalledWith(mockPasswordIdentity.id, mockPasswordIdentity)
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, expect.any(User))

      expect(result).toBeInstanceOf(TokensDto)
      expect(result.accessToken).toBe(mockAccessToken)
      expect(result.refreshToken).toBe(mockRefreshToken.token)
    })

    it('should throw UnauthorizedException when password identity is not found', async () => {
      // Arrange
      passwordIdentityRepository.findByEmail.mockResolvedValue(null)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException)

      expect(passwordIdentityRepository.findByEmail).toHaveBeenCalledWith(mockLoginDto.email)
      expect(passwordHasher.compare).not.toHaveBeenCalled()
      expect(accessTokenJwt.sign).not.toHaveBeenCalled()
      expect(refreshTokenService.create).not.toHaveBeenCalled()
      expect(passwordIdentityRepository.update).not.toHaveBeenCalled()
      expect(userRepository.update).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedException when password comparison fails', async () => {
      // Arrange
      passwordIdentityRepository.findByEmail.mockResolvedValue(mockPasswordIdentity)
      passwordHasher.compare.mockResolvedValue(false)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException)

      expect(passwordIdentityRepository.findByEmail).toHaveBeenCalledWith(mockLoginDto.email)
      expect(passwordHasher.compare).toHaveBeenCalledWith(mockLoginDto.password, mockPasswordIdentity.passwordHash)
      expect(accessTokenJwt.sign).not.toHaveBeenCalled()
      expect(refreshTokenService.create).not.toHaveBeenCalled()
      expect(passwordIdentityRepository.update).not.toHaveBeenCalled()
      expect(userRepository.update).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedException when password identity has no password hash', async () => {
      // Arrange
      const passwordIdentityWithoutHash = plainToInstance(PasswordIdentity, {
        id: mockPasswordIdentity.id,
        user: mockPasswordIdentity.user,
        email: mockPasswordIdentity.email,
        passwordHash: null,
        authProvider: mockPasswordIdentity.authProvider,
        lastSignInAt: mockPasswordIdentity.lastSignInAt,
        createdAt: mockPasswordIdentity.createdAt,
        updatedAt: mockPasswordIdentity.updatedAt,
        updateLastSignInAt: jest.fn(),
      })
      passwordIdentityRepository.findByEmail.mockResolvedValue(passwordIdentityWithoutHash)
      passwordHasher.compare.mockResolvedValue(false)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException)

      expect(passwordIdentityRepository.findByEmail).toHaveBeenCalledWith(mockLoginDto.email)
      expect(passwordHasher.compare).toHaveBeenCalledWith(mockLoginDto.password, '')
      expect(accessTokenJwt.sign).not.toHaveBeenCalled()
      expect(refreshTokenService.create).not.toHaveBeenCalled()
      expect(passwordIdentityRepository.update).not.toHaveBeenCalled()
      expect(userRepository.update).not.toHaveBeenCalled()
    })

    it('should include correct error message in UnauthorizedException', async () => {
      // Arrange
      passwordIdentityRepository.findByEmail.mockResolvedValue(null)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        expect.objectContaining({
          response: plainToInstance(CommonResponseDto, {
            message: 'Email or password is incorrect.',
          })
        })
      )

      expect(passwordIdentityRepository.findByEmail).toHaveBeenCalledWith(mockLoginDto.email)
      expect(passwordIdentityRepository.update).not.toHaveBeenCalled()
      expect(userRepository.update).not.toHaveBeenCalled()
    })

    it('should update last sign-in time for both password identity and user on successful login', async () => {
      // Arrange
      passwordIdentityRepository.findByEmail.mockResolvedValue(mockPasswordIdentity)
      passwordHasher.compare.mockResolvedValue(true)
      accessTokenJwt.sign.mockResolvedValue(mockAccessToken)
      refreshTokenService.create.mockResolvedValue(mockRefreshToken)

      // Act
      await handler.execute(command)

      // Assert that repositories are updated with correct parameters
      expect(passwordIdentityRepository.update).toHaveBeenCalledTimes(1)
      expect(passwordIdentityRepository.update).toHaveBeenCalledWith(mockPasswordIdentity.id, mockPasswordIdentity)

      expect(userRepository.update).toHaveBeenCalledTimes(1)
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, expect.any(User))
    })

    it('should call audit methods in correct order after successful authentication', async () => {
      // Arrange
      passwordIdentityRepository.findByEmail.mockResolvedValue(mockPasswordIdentity)
      passwordHasher.compare.mockResolvedValue(true)
      accessTokenJwt.sign.mockResolvedValue(mockAccessToken)
      refreshTokenService.create.mockResolvedValue(mockRefreshToken)

      // Act
      await handler.execute(command)

      // Assert the order of calls
      expect(passwordIdentityRepository.findByEmail).toHaveBeenCalled()
      expect(passwordHasher.compare).toHaveBeenCalledWith(mockLoginDto.password, mockPasswordIdentity.passwordHash)
      expect(accessTokenJwt.sign).toHaveBeenCalledWith(mockUser.id)
      expect(refreshTokenService.create).toHaveBeenCalledWith(expect.any(User), mockUserAgent, mockIpAddress)
      expect(passwordIdentityRepository.update).toHaveBeenCalledWith(mockPasswordIdentity.id, mockPasswordIdentity)
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, expect.any(User))
    })
  })
})
