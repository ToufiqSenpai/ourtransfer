import { Test, TestingModule } from '@nestjs/testing'
import { EventBus } from '@nestjs/cqrs'
import { mock, MockProxy } from 'jest-mock-extended'
import { faker } from '@faker-js/faker'
import { plainToInstance } from 'class-transformer'
import { GoogleOAuth2CallbackHandler } from './google-oauth2-callback.handler'
import { GoogleOAuth2CallbackCommand } from '../google-oauth2-callback.command'
import { GoogleOAuth2Service } from '../../services/google-oauth2.service'
import { RefreshTokenService } from '../../services/refresh-token.service'
import { OAuth2Platform } from '../../enums/oauth2-platform.enum'
import { UserLoggedInEvent } from '../../events/user-logged-in.event'
import { User } from '../../../user/entities/user.entity'
import { RefreshToken } from '../../entities/refresh-token.entity'

/**
 * Unit tests for GoogleOAuth2CallbackHandler
 *
 * Tests the command handler responsible for processing Google OAuth2 callback:
 * - Verifying OAuth2 state and code
 * - Creating refresh tokens
 * - Publishing login events for web platform
 * - Returning appropriate response based on platform
 */
describe('GoogleOAuth2CallbackHandler', () => {
  let handler: GoogleOAuth2CallbackHandler
  let googleOAuth2Service: MockProxy<GoogleOAuth2Service>
  let refreshTokenService: MockProxy<RefreshTokenService>
  let eventBus: MockProxy<EventBus>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleOAuth2CallbackHandler,
        {
          provide: GoogleOAuth2Service,
          useValue: mock<GoogleOAuth2Service>(),
        },
        {
          provide: RefreshTokenService,
          useValue: mock<RefreshTokenService>(),
        },
        {
          provide: EventBus,
          useValue: mock<EventBus>(),
        },
      ],
    }).compile()

    handler = module.get<GoogleOAuth2CallbackHandler>(GoogleOAuth2CallbackHandler)
    googleOAuth2Service = module.get<MockProxy<GoogleOAuth2Service>>(GoogleOAuth2Service)
    refreshTokenService = module.get<MockProxy<RefreshTokenService>>(RefreshTokenService)
    eventBus = module.get<MockProxy<EventBus>>(EventBus)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    const createMockUser = (overrides: Partial<User> = {}): User => {
      return plainToInstance(User, {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        ...overrides,
      })
    }

    const createMockRefreshToken = (): RefreshToken => {
      return plainToInstance(RefreshToken, {
        id: faker.string.uuid(),
        token: faker.string.alphanumeric(64),
        userAgent: faker.internet.userAgent(),
        ipAddress: faker.internet.ip(),
        revoked: false,
        expiresAt: faker.date.future(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
      })
    }

    const createCommand = (overrides: Partial<{
      code: string
      state: string
      userAgent: string
      ipAddress: string
    }> = {}): GoogleOAuth2CallbackCommand => {
      return new GoogleOAuth2CallbackCommand(
        overrides.code ?? faker.string.alphanumeric(32),
        overrides.state ?? faker.string.uuid(),
        overrides.userAgent ?? faker.internet.userAgent(),
        overrides.ipAddress ?? faker.internet.ip()
      )
    }

    describe('successful OAuth2 callback scenarios', () => {
      it('should handle web platform OAuth2 callback successfully', async () => {
        // Arrange
        const mockUser = createMockUser()
        const mockRefreshToken = createMockRefreshToken()
        const command = createCommand()

        googleOAuth2Service.verify.mockResolvedValue([mockUser, OAuth2Platform.WEB])
        refreshTokenService.create.mockResolvedValue(mockRefreshToken)

        // Act
        const result = await handler.execute(command)

        // Assert
        expect(googleOAuth2Service.verify).toHaveBeenCalledWith(command.state, command.code)
        expect(refreshTokenService.create).toHaveBeenCalledWith(mockUser, command.userAgent, command.ipAddress)
        expect(eventBus.publish).toHaveBeenCalledWith(expect.any(UserLoggedInEvent))

        const publishedEvent = eventBus.publish.mock.calls[0][0] as UserLoggedInEvent
        expect(publishedEvent.user).toBe(mockUser)

        expect(result).toEqual({
          platform: OAuth2Platform.WEB,
          refreshToken: mockRefreshToken.token
        })
      })

      it('should handle desktop platform OAuth2 callback successfully', async () => {
        // Arrange
        const mockUser = createMockUser()
        const mockRefreshToken = createMockRefreshToken()
        const command = createCommand()

        googleOAuth2Service.verify.mockResolvedValue([mockUser, OAuth2Platform.DESKTOP])
        refreshTokenService.create.mockResolvedValue(mockRefreshToken)

        // Act
        const result = await handler.execute(command)

        // Assert
        expect(googleOAuth2Service.verify).toHaveBeenCalledWith(command.state, command.code)
        expect(refreshTokenService.create).toHaveBeenCalledWith(mockUser, command.userAgent, command.ipAddress)
        expect(eventBus.publish).not.toHaveBeenCalled() // No event for non-web platforms

        expect(result).toEqual({
          platform: OAuth2Platform.DESKTOP,
          refreshToken: mockRefreshToken.token
        })
      })

      it('should handle mobile platform OAuth2 callbacks without publishing events', async () => {
        // Arrange
        const platforms = [OAuth2Platform.ANDROID, OAuth2Platform.IOS]

        for (const platform of platforms) {
          const mockUser = createMockUser()
          const mockRefreshToken = createMockRefreshToken()
          const command = createCommand()

          googleOAuth2Service.verify.mockResolvedValue([mockUser, platform])
          refreshTokenService.create.mockResolvedValue(mockRefreshToken)

          // Act
          const result = await handler.execute(command)

          // Assert
          expect(googleOAuth2Service.verify).toHaveBeenCalledWith(command.state, command.code)
          expect(refreshTokenService.create).toHaveBeenCalledWith(mockUser, command.userAgent, command.ipAddress)
          expect(eventBus.publish).not.toHaveBeenCalled() // No event for mobile platforms

          expect(result).toEqual({
            platform,
            refreshToken: mockRefreshToken.token
          })

          // Reset mocks for next iteration
          jest.clearAllMocks()
        }
      })

      it('should handle different OAuth2 codes and states', async () => {
        // Arrange
        const testCases = [
          { code: 'short_code', state: 'simple_state' },
          { code: faker.string.alphanumeric(64), state: faker.string.uuid() },
          { code: 'code-with-dashes', state: 'state_with_underscores' },
        ]

        for (const { code, state } of testCases) {
          const mockUser = createMockUser()
          const mockRefreshToken = createMockRefreshToken()
          const command = createCommand({ code, state })

          googleOAuth2Service.verify.mockResolvedValue([mockUser, OAuth2Platform.WEB])
          refreshTokenService.create.mockResolvedValue(mockRefreshToken)

          // Act
          const result = await handler.execute(command)

          // Assert
          expect(googleOAuth2Service.verify).toHaveBeenCalledWith(state, code)
          expect(result).toEqual({
            platform: OAuth2Platform.WEB,
            refreshToken: mockRefreshToken.token
          })

          // Reset mocks for next iteration
          jest.clearAllMocks()
        }
      })

      it('should handle different user agents and IP addresses', async () => {
        // Arrange
        const mockUser = createMockUser()
        const mockRefreshToken = createMockRefreshToken()
        const userAgent = 'Custom User Agent 1.0'
        const ipAddress = '192.168.1.100'
        const command = createCommand({ userAgent, ipAddress })

        googleOAuth2Service.verify.mockResolvedValue([mockUser, OAuth2Platform.WEB])
        refreshTokenService.create.mockResolvedValue(mockRefreshToken)

        // Act
        await handler.execute(command)

        // Assert
        expect(refreshTokenService.create).toHaveBeenCalledWith(mockUser, userAgent, ipAddress)
      })
    })

    describe('error handling', () => {
      it('should propagate errors from googleOAuth2Service.verify', async () => {
        // Arrange
        const command = createCommand()
        const oauth2Error = new Error('Invalid OAuth2 state or code')

        googleOAuth2Service.verify.mockRejectedValue(oauth2Error)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(oauth2Error)
        expect(refreshTokenService.create).not.toHaveBeenCalled()
        expect(eventBus.publish).not.toHaveBeenCalled()
      })

      it('should propagate errors from refreshTokenService.create', async () => {
        // Arrange
        const mockUser = createMockUser()
        const command = createCommand()
        const refreshTokenError = new Error('Failed to create refresh token')

        googleOAuth2Service.verify.mockResolvedValue([mockUser, OAuth2Platform.WEB])
        refreshTokenService.create.mockRejectedValue(refreshTokenError)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(refreshTokenError)
        expect(googleOAuth2Service.verify).toHaveBeenCalledWith(command.state, command.code)
        expect(eventBus.publish).not.toHaveBeenCalled()
      })

      it('should handle eventBus.publish errors gracefully for web platform', async () => {
        // Arrange
        const mockUser = createMockUser()
        const mockRefreshToken = createMockRefreshToken()
        const command = createCommand()
        const eventError = new Error('Event publishing failed')

        googleOAuth2Service.verify.mockResolvedValue([mockUser, OAuth2Platform.WEB])
        refreshTokenService.create.mockResolvedValue(mockRefreshToken)
        eventBus.publish.mockImplementation(() => {
          throw eventError
        })

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(eventError)
        expect(googleOAuth2Service.verify).toHaveBeenCalledWith(command.state, command.code)
        expect(refreshTokenService.create).toHaveBeenCalledWith(mockUser, command.userAgent, command.ipAddress)
      })

      it('should handle network or service unavailability errors', async () => {
        // Arrange
        const command = createCommand()
        const networkError = new Error('Network timeout')

        googleOAuth2Service.verify.mockRejectedValue(networkError)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(networkError)
      })
    })

    describe('transactional behavior', () => {
      it('should call services in correct order', async () => {
        // Arrange
        const mockUser = createMockUser()
        const mockRefreshToken = createMockRefreshToken()
        const command = createCommand()
        const callOrder: string[] = []

        googleOAuth2Service.verify.mockImplementation(async () => {
          callOrder.push('verify')
          return [mockUser, OAuth2Platform.WEB]
        })

        refreshTokenService.create.mockImplementation(async () => {
          callOrder.push('createRefreshToken')
          return mockRefreshToken
        })

        eventBus.publish.mockImplementation(() => {
          callOrder.push('publishEvent')
        })

        // Act
        await handler.execute(command)

        // Assert
        expect(callOrder).toEqual(['verify', 'createRefreshToken', 'publishEvent'])
      })

      it('should not create refresh token if OAuth2 verification fails', async () => {
        // Arrange
        const command = createCommand()
        const oauth2Error = new Error('OAuth2 verification failed')

        googleOAuth2Service.verify.mockRejectedValue(oauth2Error)

        // Act & Assert
        try {
          await handler.execute(command)
        } catch {
          // Expected to throw
        }

        expect(refreshTokenService.create).not.toHaveBeenCalled()
        expect(eventBus.publish).not.toHaveBeenCalled()
      })

      it('should not publish event if refresh token creation fails', async () => {
        // Arrange
        const mockUser = createMockUser()
        const command = createCommand()
        const refreshTokenError = new Error('Refresh token creation failed')

        googleOAuth2Service.verify.mockResolvedValue([mockUser, OAuth2Platform.WEB])
        refreshTokenService.create.mockRejectedValue(refreshTokenError)

        // Act & Assert
        try {
          await handler.execute(command)
        } catch {
          // Expected to throw
        }

        expect(eventBus.publish).not.toHaveBeenCalled()
      })
    })

    describe('platform-specific behavior', () => {
      it('should only publish UserLoggedInEvent for web platform', async () => {
        // Arrange
        const mockUser = createMockUser()
        const mockRefreshToken = createMockRefreshToken()
        const allPlatforms = [OAuth2Platform.WEB, OAuth2Platform.DESKTOP, OAuth2Platform.ANDROID, OAuth2Platform.IOS]

        for (const platform of allPlatforms) {
          const command = createCommand()

          googleOAuth2Service.verify.mockResolvedValue([mockUser, platform])
          refreshTokenService.create.mockResolvedValue(mockRefreshToken)

          // Act
          await handler.execute(command)

          // Assert
          if (platform === OAuth2Platform.WEB) {
            expect(eventBus.publish).toHaveBeenCalledWith(expect.any(UserLoggedInEvent))
          } else {
            expect(eventBus.publish).not.toHaveBeenCalled()
          }

          // Reset mocks for next iteration
          jest.clearAllMocks()
        }
      })

      it('should return correct platform in response', async () => {
        // Arrange
        const mockUser = createMockUser()
        const mockRefreshToken = createMockRefreshToken()
        const platforms = [OAuth2Platform.WEB, OAuth2Platform.DESKTOP, OAuth2Platform.ANDROID, OAuth2Platform.IOS]

        for (const platform of platforms) {
          const command = createCommand()

          googleOAuth2Service.verify.mockResolvedValue([mockUser, platform])
          refreshTokenService.create.mockResolvedValue(mockRefreshToken)

          // Act
          const result = await handler.execute(command)

          // Assert
          expect(result.platform).toBe(platform)
          expect(result.refreshToken).toBe(mockRefreshToken.token)

          // Reset mocks for next iteration
          jest.clearAllMocks()
        }
      })
    })

    describe('edge cases', () => {
      it('should handle empty or undefined command properties gracefully', async () => {
        // Arrange
        const mockUser = createMockUser()
        const mockRefreshToken = createMockRefreshToken()
        const command = createCommand({
          code: '',
          state: '',
          userAgent: '',
          ipAddress: ''
        })

        googleOAuth2Service.verify.mockResolvedValue([mockUser, OAuth2Platform.WEB])
        refreshTokenService.create.mockResolvedValue(mockRefreshToken)

        // Act
        const result = await handler.execute(command)

        // Assert
        expect(googleOAuth2Service.verify).toHaveBeenCalledWith('', '')
        expect(refreshTokenService.create).toHaveBeenCalledWith(mockUser, '', '')
        expect(result).toEqual({
          platform: OAuth2Platform.WEB,
          refreshToken: mockRefreshToken.token
        })
      })

      it('should handle very long OAuth2 parameters', async () => {
        // Arrange
        const mockUser = createMockUser()
        const mockRefreshToken = createMockRefreshToken()
        const command = createCommand({
          code: 'a'.repeat(1000),
          state: 'b'.repeat(1000),
          userAgent: 'c'.repeat(500),
          ipAddress: '192.168.1.1'
        })

        googleOAuth2Service.verify.mockResolvedValue([mockUser, OAuth2Platform.DESKTOP])
        refreshTokenService.create.mockResolvedValue(mockRefreshToken)

        // Act
        const result = await handler.execute(command)

        // Assert
        expect(result).toEqual({
          platform: OAuth2Platform.DESKTOP,
          refreshToken: mockRefreshToken.token
        })
      })

      it('should handle special characters in OAuth2 parameters', async () => {
        // Arrange
        const mockUser = createMockUser()
        const mockRefreshToken = createMockRefreshToken()
        const command = createCommand({
          code: 'code+with/special=characters&symbols',
          state: 'state-with_special.characters',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          ipAddress: '::1'
        })

        googleOAuth2Service.verify.mockResolvedValue([mockUser, OAuth2Platform.WEB])
        refreshTokenService.create.mockResolvedValue(mockRefreshToken)

        // Act
        const result = await handler.execute(command)

        // Assert
        expect(result).toEqual({
          platform: OAuth2Platform.WEB,
          refreshToken: mockRefreshToken.token
        })
      })
    })
  })
})
