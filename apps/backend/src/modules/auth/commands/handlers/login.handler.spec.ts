import { Test, TestingModule } from '@nestjs/testing'
import { EventBus } from '@nestjs/cqrs'
import { UnauthorizedException } from '@nestjs/common'
import { mock, MockProxy } from 'jest-mock-extended'
import { faker } from '@faker-js/faker'
import { plainToInstance } from 'class-transformer'
import { LoginHandler } from './login.handler'
import { LoginCommand } from '../login.command'
import { LoginDto, TokensDto } from '@ourtransfer/dto'
import { PASSWORD_HASHER, PasswordHasher } from '../../../../infrastructure/security/hash/password-hasher.interface'
import { ACCESS_TOKEN_JWT, AccessTokenJwt } from '../../../../infrastructure/security/jwt/access-token-jwt.interface'
import { RefreshTokenService } from '../../services/refresh-token.service'
import { LoginVerificationCodeService } from '../../services/login-verification-code.service'
import { TwoFactorAuthenticationService } from '../../services/two-factor-authentication.service'
import { UserRepository } from '../../../user/repositories/user.repository'
import { User } from '../../../user/entities/user.entity'
import { RefreshToken } from '../../entities/refresh-token.entity'
import { TwoFactorAuthentication } from '../../entities/two-factor-authentication.entity'
import { UserLoggedInEvent } from '../../events/user-logged-in.event'
import { AuthProvider, AuthenticationStatus } from '@ourtransfer/common'

describe('LoginHandler', () => {
  let handler: LoginHandler
  let passwordHasher: MockProxy<PasswordHasher>
  let accessTokenJwt: MockProxy<AccessTokenJwt>
  let refreshTokenService: MockProxy<RefreshTokenService>
  let loginVerificationCodeService: MockProxy<LoginVerificationCodeService>
  let twoFactorAuthenticationService: MockProxy<TwoFactorAuthenticationService>
  let userRepository: MockProxy<UserRepository>
  let eventBus: MockProxy<EventBus>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginHandler,
        {
          provide: PASSWORD_HASHER,
          useValue: mock<PasswordHasher>(),
        },
        {
          provide: ACCESS_TOKEN_JWT,
          useValue: mock<AccessTokenJwt>(),
        },
        {
          provide: RefreshTokenService,
          useValue: mock<RefreshTokenService>(),
        },
        {
          provide: LoginVerificationCodeService,
          useValue: mock<LoginVerificationCodeService>(),
        },
        {
          provide: TwoFactorAuthenticationService,
          useValue: mock<TwoFactorAuthenticationService>(),
        },
        {
          provide: UserRepository,
          useValue: mock<UserRepository>(),
        },
        {
          provide: EventBus,
          useValue: mock<EventBus>(),
        },
      ],
    }).compile()

    handler = module.get<LoginHandler>(LoginHandler)
    passwordHasher = module.get(PASSWORD_HASHER)
    accessTokenJwt = module.get(ACCESS_TOKEN_JWT)
    refreshTokenService = module.get<MockProxy<RefreshTokenService>>(RefreshTokenService)
    loginVerificationCodeService = module.get<MockProxy<LoginVerificationCodeService>>(LoginVerificationCodeService)
    twoFactorAuthenticationService = module.get<MockProxy<TwoFactorAuthenticationService>>(TwoFactorAuthenticationService)
    userRepository = module.get<MockProxy<UserRepository>>(UserRepository)
    eventBus = module.get<MockProxy<EventBus>>(EventBus)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    const mockUserAgent = faker.internet.userAgent()
    const mockIpAddress = faker.internet.ip()
    const mockAccessToken = faker.string.alphanumeric(128)
    const mockRefreshTokenString = faker.string.alphanumeric(64)

    const createMockUser = (overrides: Partial<User> = {}): User => {
      return plainToInstance(User, {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        ...overrides,
      })
    }

    const createMockRefreshToken = (): RefreshToken => {
      return plainToInstance(RefreshToken, {
        id: faker.string.uuid(),
        token: mockRefreshTokenString,
        userAgent: mockUserAgent,
        ipAddress: mockIpAddress,
        revoked: false,
        expiresAt: faker.date.future(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
      })
    }

    const createLoginCommand = (loginDto: Partial<LoginDto> = {}): LoginCommand => {
      const defaultLoginDto = plainToInstance(LoginDto, {
        email: faker.internet.email(),
        password: faker.internet.password(),
        ...loginDto,
      })
      return new LoginCommand(defaultLoginDto, mockUserAgent, mockIpAddress)
    }

    describe('successful login scenarios', () => {
      it('should login successfully with email and password (no 2FA)', async () => {
        // Arrange
        const mockUser = createMockUser({ twoFactorAuthentication: undefined })
        const mockRefreshToken = createMockRefreshToken()
        const command = createLoginCommand({
          email: mockUser.email,
          password: 'correct-password'
        })

        userRepository.findByEmail.mockResolvedValue(mockUser)
        passwordHasher.compare.mockResolvedValue(true)
        refreshTokenService.create.mockResolvedValue(mockRefreshToken)
        accessTokenJwt.sign.mockResolvedValue(mockAccessToken)

        // Act
        const result = await handler.execute(command)

        // Assert
        expect(userRepository.findByEmail).toHaveBeenCalledWith(command.dto.email)
        expect(passwordHasher.compare).toHaveBeenCalledWith('correct-password', mockUser.password)
        expect(refreshTokenService.create).toHaveBeenCalledWith(mockUser, mockUserAgent, mockIpAddress)
        expect(accessTokenJwt.sign).toHaveBeenCalledWith(mockUser.id)
        expect(eventBus.publish).toHaveBeenCalledWith(
          expect.any(UserLoggedInEvent)
        )

        expect(result).toBeInstanceOf(TokensDto)
        expect(result.refreshToken).toBe(mockRefreshTokenString)
        expect(result.accessToken).toBe(mockAccessToken)
      })

      it('should login successfully with verification code (passwordless user)', async () => {
        // Arrange
        const mockUser = createMockUser({
          password: undefined,
          twoFactorAuthentication: undefined
        })
        const mockRefreshToken = createMockRefreshToken()
        const verificationCode = '123456'
        const command = createLoginCommand({
          email: mockUser.email,
          verificationCode,
          password: undefined
        })

        userRepository.findByEmail.mockResolvedValue(mockUser)
        loginVerificationCodeService.verifyCode.mockResolvedValue(true)
        refreshTokenService.create.mockResolvedValue(mockRefreshToken)
        accessTokenJwt.sign.mockResolvedValue(mockAccessToken)

        // Act
        const result = await handler.execute(command)

        // Assert
        expect(userRepository.findByEmail).toHaveBeenCalledWith(command.dto.email)
        expect(loginVerificationCodeService.verifyCode).toHaveBeenCalledWith(mockUser, verificationCode)
        expect(passwordHasher.compare).not.toHaveBeenCalled()
        expect(refreshTokenService.create).toHaveBeenCalledWith(mockUser, mockUserAgent, mockIpAddress)
        expect(accessTokenJwt.sign).toHaveBeenCalledWith(mockUser.id)
        expect(eventBus.publish).toHaveBeenCalledWith(
          expect.any(UserLoggedInEvent)
        )

        expect(result).toBeInstanceOf(TokensDto)
        expect(result.refreshToken).toBe(mockRefreshTokenString)
        expect(result.accessToken).toBe(mockAccessToken)
      })

      it('should login successfully with password and 2FA', async () => {
        // Arrange
        const mockTwoFA = plainToInstance(TwoFactorAuthentication, {
          id: faker.string.uuid(),
          secret: faker.string.alphanumeric(32),
        })
        const mockUser = createMockUser({ twoFactorAuthentication: mockTwoFA })
        const mockRefreshToken = createMockRefreshToken()
        const twoFactorCode = '123456'
        const command = createLoginCommand({
          email: mockUser.email,
          password: 'correct-password',
          twoFactorCode
        })

        userRepository.findByEmail.mockResolvedValue(mockUser)
        passwordHasher.compare.mockResolvedValue(true)
        twoFactorAuthenticationService.verifyCode.mockResolvedValue(true)
        refreshTokenService.create.mockResolvedValue(mockRefreshToken)
        accessTokenJwt.sign.mockResolvedValue(mockAccessToken)

        // Act
        const result = await handler.execute(command)

        // Assert
        expect(userRepository.findByEmail).toHaveBeenCalledWith(command.dto.email)
        expect(passwordHasher.compare).toHaveBeenCalledWith('correct-password', mockUser.password)
        expect(twoFactorAuthenticationService.verifyCode).toHaveBeenCalledWith(mockUser.email, twoFactorCode)
        expect(refreshTokenService.create).toHaveBeenCalledWith(mockUser, mockUserAgent, mockIpAddress)
        expect(accessTokenJwt.sign).toHaveBeenCalledWith(mockUser.id)
        expect(eventBus.publish).toHaveBeenCalledWith(
          expect.any(UserLoggedInEvent)
        )

        expect(result).toBeInstanceOf(TokensDto)
        expect(result.refreshToken).toBe(mockRefreshTokenString)
        expect(result.accessToken).toBe(mockAccessToken)
      })
    })

    describe('authentication failure scenarios', () => {
      it('should throw UnauthorizedException when user not found', async () => {
        // Arrange
        const command = createLoginCommand({ email: 'nonexistent@example.com' })
        userRepository.findByEmail.mockResolvedValue(null)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          new UnauthorizedException({
            status: AuthenticationStatus.USER_NOT_FOUND,
            message: 'Invalid credentials',
          })
        )

        expect(userRepository.findByEmail).toHaveBeenCalledWith(command.dto.email)
        expect(passwordHasher.compare).not.toHaveBeenCalled()
        expect(eventBus.publish).not.toHaveBeenCalled()
      })

      it('should throw UnauthorizedException when verification code is required but not provided', async () => {
        // Arrange
        const mockUser = createMockUser({ password: undefined })
        const command = createLoginCommand({
          email: mockUser.email,
          password: undefined,
          verificationCode: undefined
        })
        userRepository.findByEmail.mockResolvedValue(mockUser)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          new UnauthorizedException({
            status: AuthenticationStatus.INVALID_VERIFICATION_CODE,
            message: 'Verification code is required for login',
          })
        )

        expect(userRepository.findByEmail).toHaveBeenCalledWith(command.dto.email)
        expect(loginVerificationCodeService.verifyCode).not.toHaveBeenCalled()
        expect(eventBus.publish).not.toHaveBeenCalled()
      })

      it('should throw UnauthorizedException when verification code is invalid', async () => {
        // Arrange
        const mockUser = createMockUser({ password: undefined })
        const command = createLoginCommand({
          email: mockUser.email,
          verificationCode: 'invalid-code',
          password: undefined
        })
        userRepository.findByEmail.mockResolvedValue(mockUser)
        loginVerificationCodeService.verifyCode.mockResolvedValue(false)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          new UnauthorizedException({
            status: AuthenticationStatus.INVALID_VERIFICATION_CODE,
            message: 'Invalid verification code',
          })
        )

        expect(userRepository.findByEmail).toHaveBeenCalledWith(command.dto.email)
        expect(loginVerificationCodeService.verifyCode).toHaveBeenCalledWith(mockUser, 'invalid-code')
        expect(eventBus.publish).not.toHaveBeenCalled()
      })

      it('should throw UnauthorizedException when password is incorrect', async () => {
        // Arrange
        const mockUser = createMockUser({ twoFactorAuthentication: undefined })
        const command = createLoginCommand({
          email: mockUser.email,
          password: 'wrong-password'
        })
        userRepository.findByEmail.mockResolvedValue(mockUser)
        passwordHasher.compare.mockResolvedValue(false)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          new UnauthorizedException({
            status: AuthenticationStatus.INVALID_CREDENTIALS,
            message: 'Invalid email or password',
          })
        )

        expect(userRepository.findByEmail).toHaveBeenCalledWith(command.dto.email)
        expect(passwordHasher.compare).toHaveBeenCalledWith('wrong-password', mockUser.password)
        expect(eventBus.publish).not.toHaveBeenCalled()
      })

      it('should throw UnauthorizedException when 2FA code is required but not provided', async () => {
        // Arrange
        const mockTwoFA = plainToInstance(TwoFactorAuthentication, {
          id: faker.string.uuid(),
          secret: faker.string.alphanumeric(32),
        })
        const mockUser = createMockUser({ twoFactorAuthentication: mockTwoFA })
        const command = createLoginCommand({
          email: mockUser.email,
          password: 'correct-password',
          twoFactorCode: undefined
        })
        userRepository.findByEmail.mockResolvedValue(mockUser)
        passwordHasher.compare.mockResolvedValue(true)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          new UnauthorizedException({
            status: AuthenticationStatus.INVALID_2FA_CODE,
            message: 'Two-factor authentication code is required',
          })
        )

        expect(userRepository.findByEmail).toHaveBeenCalledWith(command.dto.email)
        expect(passwordHasher.compare).toHaveBeenCalledWith('correct-password', mockUser.password)
        expect(twoFactorAuthenticationService.verifyCode).not.toHaveBeenCalled()
        expect(eventBus.publish).not.toHaveBeenCalled()
      })

      it('should throw UnauthorizedException when 2FA code is invalid', async () => {
        // Arrange
        const mockTwoFA = plainToInstance(TwoFactorAuthentication, {
          id: faker.string.uuid(),
          secret: faker.string.alphanumeric(32),
        })
        const mockUser = createMockUser({ twoFactorAuthentication: mockTwoFA })
        const command = createLoginCommand({
          email: mockUser.email,
          password: 'correct-password',
          twoFactorCode: 'invalid-2fa-code'
        })
        userRepository.findByEmail.mockResolvedValue(mockUser)
        passwordHasher.compare.mockResolvedValue(true)
        twoFactorAuthenticationService.verifyCode.mockResolvedValue(false)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          new UnauthorizedException({
            status: AuthenticationStatus.INVALID_2FA_CODE,
            message: 'Invalid two-factor authentication code',
          })
        )

        expect(userRepository.findByEmail).toHaveBeenCalledWith(command.dto.email)
        expect(passwordHasher.compare).toHaveBeenCalledWith('correct-password', mockUser.password)
        expect(twoFactorAuthenticationService.verifyCode).toHaveBeenCalledWith(mockUser.email, 'invalid-2fa-code')
        expect(eventBus.publish).not.toHaveBeenCalled()
      })
    })

    describe('error handling', () => {
      it('should propagate errors from userRepository.findByEmail', async () => {
        // Arrange
        const command = createLoginCommand()
        const repositoryError = new Error(faker.lorem.sentence())
        userRepository.findByEmail.mockRejectedValue(repositoryError)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(repositoryError)
      })

      it('should propagate errors from passwordHasher.compare', async () => {
        // Arrange
        const mockUser = createMockUser()
        const command = createLoginCommand({ email: mockUser.email })
        const hashError = new Error(faker.lorem.sentence())
        userRepository.findByEmail.mockResolvedValue(mockUser)
        passwordHasher.compare.mockRejectedValue(hashError)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(hashError)
      })

      it('should propagate errors from loginVerificationCodeService.verifyCode', async () => {
        // Arrange
        const mockUser = createMockUser({ password: undefined })
        const command = createLoginCommand({
          email: mockUser.email,
          verificationCode: '123456',
          password: undefined
        })
        const verificationError = new Error(faker.lorem.sentence())
        userRepository.findByEmail.mockResolvedValue(mockUser)
        loginVerificationCodeService.verifyCode.mockRejectedValue(verificationError)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(verificationError)
      })

      it('should propagate errors from twoFactorAuthenticationService.verifyCode', async () => {
        // Arrange
        const mockTwoFA = plainToInstance(TwoFactorAuthentication, {
          id: faker.string.uuid(),
          secret: faker.string.alphanumeric(32),
        })
        const mockUser = createMockUser({ twoFactorAuthentication: mockTwoFA })
        const command = createLoginCommand({
          email: mockUser.email,
          password: 'correct-password',
          twoFactorCode: '123456'
        })
        const twoFAError = new Error(faker.lorem.sentence())
        userRepository.findByEmail.mockResolvedValue(mockUser)
        passwordHasher.compare.mockResolvedValue(true)
        twoFactorAuthenticationService.verifyCode.mockRejectedValue(twoFAError)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(twoFAError)
      })

      it('should propagate errors from refreshTokenService.create', async () => {
        // Arrange
        const mockUser = createMockUser()
        const command = createLoginCommand({ email: mockUser.email })
        const refreshTokenError = new Error(faker.lorem.sentence())
        userRepository.findByEmail.mockResolvedValue(mockUser)
        passwordHasher.compare.mockResolvedValue(true)
        refreshTokenService.create.mockRejectedValue(refreshTokenError)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(refreshTokenError)
      })

      it('should propagate errors from accessTokenJwt.sign', async () => {
        // Arrange
        const mockUser = createMockUser()
        const mockRefreshToken = createMockRefreshToken()
        const command = createLoginCommand({ email: mockUser.email })
        const accessTokenError = new Error(faker.lorem.sentence())
        userRepository.findByEmail.mockResolvedValue(mockUser)
        passwordHasher.compare.mockResolvedValue(true)
        refreshTokenService.create.mockResolvedValue(mockRefreshToken)
        accessTokenJwt.sign.mockRejectedValue(accessTokenError)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(accessTokenError)
      })
    })

    describe('edge cases', () => {
      it('should handle user without password and without 2FA', async () => {
        // Arrange
        const mockUser = createMockUser({
          password: undefined,
          twoFactorAuthentication: undefined
        })
        const mockRefreshToken = createMockRefreshToken()
        const command = createLoginCommand({
          email: mockUser.email,
          verificationCode: '123456',
          password: undefined
        })

        userRepository.findByEmail.mockResolvedValue(mockUser)
        loginVerificationCodeService.verifyCode.mockResolvedValue(true)
        refreshTokenService.create.mockResolvedValue(mockRefreshToken)
        accessTokenJwt.sign.mockResolvedValue(mockAccessToken)

        // Act
        const result = await handler.execute(command)

        // Assert
        expect(passwordHasher.compare).not.toHaveBeenCalled()
        expect(twoFactorAuthenticationService.verifyCode).not.toHaveBeenCalled()
        expect(result).toBeInstanceOf(TokensDto)
        expect(result.refreshToken).toBe(mockRefreshTokenString)
        expect(result.accessToken).toBe(mockAccessToken)
      })

      it('should handle user with password but without 2FA', async () => {
        // Arrange
        const mockUser = createMockUser({ twoFactorAuthentication: undefined })
        const mockRefreshToken = createMockRefreshToken()
        const command = createLoginCommand({
          email: mockUser.email,
          password: 'correct-password'
        })

        userRepository.findByEmail.mockResolvedValue(mockUser)
        passwordHasher.compare.mockResolvedValue(true)
        refreshTokenService.create.mockResolvedValue(mockRefreshToken)
        accessTokenJwt.sign.mockResolvedValue(mockAccessToken)

        // Act
        const result = await handler.execute(command)

        // Assert
        expect(passwordHasher.compare).toHaveBeenCalledWith('correct-password', mockUser.password)
        expect(twoFactorAuthenticationService.verifyCode).not.toHaveBeenCalled()
        expect(result).toBeInstanceOf(TokensDto)
        expect(result.refreshToken).toBe(mockRefreshTokenString)
        expect(result.accessToken).toBe(mockAccessToken)
      })

      it('should handle user with undefined twoFactorAuthentication property', async () => {
        // Arrange
        const mockUser = createMockUser({ twoFactorAuthentication: undefined })
        const mockRefreshToken = createMockRefreshToken()
        const command = createLoginCommand({
          email: mockUser.email,
          password: 'correct-password'
        })

        userRepository.findByEmail.mockResolvedValue(mockUser)
        passwordHasher.compare.mockResolvedValue(true)
        refreshTokenService.create.mockResolvedValue(mockRefreshToken)
        accessTokenJwt.sign.mockResolvedValue(mockAccessToken)

        // Act
        const result = await handler.execute(command)

        // Assert
        expect(twoFactorAuthenticationService.verifyCode).not.toHaveBeenCalled()
        expect(result).toBeInstanceOf(TokensDto)
        expect(result.refreshToken).toBe(mockRefreshTokenString)
        expect(result.accessToken).toBe(mockAccessToken)
      })
    })

    describe('event publishing', () => {
      it('should publish UserLoggedInEvent with correct parameters', async () => {
        // Arrange
        const mockUser = createMockUser({ twoFactorAuthentication: undefined })
        const mockRefreshToken = createMockRefreshToken()
        const command = createLoginCommand({
          email: mockUser.email,
          password: 'correct-password'
        })

        userRepository.findByEmail.mockResolvedValue(mockUser)
        passwordHasher.compare.mockResolvedValue(true)
        refreshTokenService.create.mockResolvedValue(mockRefreshToken)
        accessTokenJwt.sign.mockResolvedValue(mockAccessToken)

        // Act
        await handler.execute(command)

        // Assert
        expect(eventBus.publish).toHaveBeenCalledTimes(1)
        const publishedEvent = eventBus.publish.mock.calls[0][0] as UserLoggedInEvent
        expect(publishedEvent).toBeInstanceOf(UserLoggedInEvent)
        expect(publishedEvent.user).toBe(mockUser)
        expect(publishedEvent.provider).toBe(AuthProvider.EMAIL_PASSWORD)
      })
    })
  })
})
