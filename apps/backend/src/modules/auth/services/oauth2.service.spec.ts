import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotImplementedException } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { mock, MockProxy } from 'jest-mock-extended'
import { faker } from '@faker-js/faker'
import { plainToInstance } from 'class-transformer'
import { of } from 'rxjs'
import { Readable } from 'stream'
import { OAuth2Service, UserProfile, OAuthSession } from './oauth2.service'
import { UserService } from '../../user/services/user.service'
import { UserRepository } from '../../user/repositories/user.repository'
import { User } from '../../user/entities/user.entity'
import { OAuth2Provider } from '../enums/oauth2-provider.enum'
import { OAuth2Platform } from '../enums/oauth2-platform.enum'
import { CommonResponseDto } from '@ourtransfer/dto'
import { Options as JwksOptions } from 'jwks-rsa'
import { CACHE, Cache } from '../../../infrastructure/cache/cache.interface'
import * as jwt from 'jsonwebtoken'

/**
 * Concrete implementation of OAuth2Service for testing
 */
class TestOAuth2Service extends OAuth2Service {
  private _provider: OAuth2Provider = OAuth2Provider.GOOGLE
  private _supportsPKCE: boolean = true
  private _jwksOptions: JwksOptions | null = {
    jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
    cache: true,
    rateLimit: true,
  }

  public get provider(): OAuth2Provider {
    return this._provider
  }

  public get supportsPKCE(): boolean {
    return this._supportsPKCE
  }

  public get jwksOptions(): JwksOptions | null {
    return this._jwksOptions
  }

  // Test methods to modify protected properties
  public setProvider(provider: OAuth2Provider): void {
    this._provider = provider
  }

  public setSupportsPKCE(supports: boolean): void {
    this._supportsPKCE = supports
  }

  public setJwksOptions(options: JwksOptions | null): void {
    this._jwksOptions = options
  }

  public async buildAuthUrl(state: string, codeChallenge?: string): Promise<string> {
    const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
    const params = new URLSearchParams({
      client_id: 'test-client-id',
      redirect_uri: 'http://localhost:3000/callback',
      response_type: 'code',
      scope: 'openid email profile',
      state,
      ...(codeChallenge && { code_challenge: codeChallenge, code_challenge_method: 'S256' }),
    })
    return `${baseUrl}?${params.toString()}`
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async getUserProfile(code: string, codeVerifier?: string): Promise<UserProfile> {
    // Mock implementation for testing
    return {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      avatarUrl: faker.image.avatar(),
    }
  }

  // Expose protected methods for testing
  public async testVerifyAndDecodeIdToken<T>(idToken: string, options?: jwt.VerifyOptions): Promise<T> {
    return this.verifyAndDecodeIdToken<T>(idToken, options)
  }
}

/**
 * Unit tests for OAuth2Service
 *
 * Tests the abstract OAuth2 service functionality including:
 * - Auth URL generation with PKCE support
 * - Session management and verification
 * - User profile retrieval and user creation
 * - ID token verification with JWKS
 * - Error handling for various scenarios
 */
describe('OAuth2Service', () => {
  let service: TestOAuth2Service
  let cache: MockProxy<Cache>
  let userService: MockProxy<UserService>
  let userRepository: MockProxy<UserRepository>
  let httpService: MockProxy<HttpService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CACHE,
          useValue: mock<Cache>(),
        },
        {
          provide: UserService,
          useValue: mock<UserService>(),
        },
        {
          provide: UserRepository,
          useValue: mock<UserRepository>(),
        },
        {
          provide: HttpService,
          useValue: mock<HttpService>(),
        },
      ],
    }).compile()

    cache = module.get<MockProxy<Cache>>(CACHE)
    userService = module.get<MockProxy<UserService>>(UserService)
    userRepository = module.get<MockProxy<UserRepository>>(UserRepository)
    httpService = module.get<MockProxy<HttpService>>(HttpService)

    service = new TestOAuth2Service(cache, userService, userRepository, httpService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getAuthUrl', () => {
    describe('successful auth URL generation', () => {
      it('should generate auth URL for web platform with PKCE', async () => {
        // Arrange
        const platform = OAuth2Platform.WEB
        cache.set.mockResolvedValue()

        // Act
        const result = await service.getAuthUrl(platform)

        // Assert
        expect(result).toContain('https://accounts.google.com/o/oauth2/v2/auth')
        expect(result).toContain('code_challenge=')
        expect(result).toContain('code_challenge_method=S256')
        expect(result).toContain('state=')
        expect(cache.set).toHaveBeenCalledWith(
          expect.stringContaining('oauth:google:'),
          expect.objectContaining({
            provider: OAuth2Provider.GOOGLE,
            platform: OAuth2Platform.WEB,
            codeVerifier: expect.any(String),
          }),
          300
        )
      })

      it('should generate auth URL without PKCE when not supported', async () => {
        // Arrange
        const platform = OAuth2Platform.WEB
        service.setSupportsPKCE(false)
        cache.set.mockResolvedValue()

        // Act
        const result = await service.getAuthUrl(platform)

        // Assert
        expect(result).toContain('https://accounts.google.com/o/oauth2/v2/auth')
        expect(result).not.toContain('code_challenge=')
        expect(result).not.toContain('code_challenge_method=')
        expect(cache.set).toHaveBeenCalledWith(
          expect.stringContaining('oauth:google:'),
          expect.objectContaining({
            provider: OAuth2Provider.GOOGLE,
            platform: OAuth2Platform.WEB,
          }),
          300
        )

        const sessionArg = cache.set.mock.calls[0][1] as OAuthSession
        expect(sessionArg.codeVerifier).toBeUndefined()
      })

      it('should generate different states for multiple calls', async () => {
        // Arrange
        const platform = OAuth2Platform.WEB
        cache.set.mockResolvedValue()

        // Act
        const result1 = await service.getAuthUrl(platform)
        const result2 = await service.getAuthUrl(platform)

        // Assert
        expect(result1).not.toBe(result2)
        expect(cache.set).toHaveBeenCalledTimes(2)

        const session1 = cache.set.mock.calls[0][1] as OAuthSession
        const session2 = cache.set.mock.calls[1][1] as OAuthSession
        expect(session1.state).not.toBe(session2.state)
      })

      it('should handle different OAuth2 providers', async () => {
        // Arrange
        const providers = [OAuth2Provider.GOOGLE, OAuth2Provider.MICROSOFT, OAuth2Provider.GITHUB]

        for (const provider of providers) {
          service.setProvider(provider)
          cache.set.mockResolvedValue()

          // Act
          await service.getAuthUrl(OAuth2Platform.WEB)

          // Assert
          expect(cache.set).toHaveBeenCalledWith(
            expect.stringContaining(`oauth:${provider.toLowerCase()}:`),
            expect.objectContaining({
              provider,
              platform: OAuth2Platform.WEB,
            }),
            300
          )

          // Reset mock for next iteration
          jest.clearAllMocks()
        }
      })
    })

    describe('platform validation', () => {
      it('should throw NotImplementedException for unsupported platforms', async () => {
        // Arrange
        const unsupportedPlatforms = [OAuth2Platform.DESKTOP, OAuth2Platform.ANDROID, OAuth2Platform.IOS]

        for (const platform of unsupportedPlatforms) {
          // Act & Assert
          await expect(service.getAuthUrl(platform)).rejects.toThrow(NotImplementedException)

          const error = await service.getAuthUrl(platform).catch(err => err)
          expect(error.getResponse()).toEqual(
            plainToInstance(CommonResponseDto, {
              message: `${platform} OAuth2 platform currently not supported.`
            })
          )
        }
      })

      it('should only support web platform currently', async () => {
        // Arrange & Act & Assert
        await expect(service.getAuthUrl(OAuth2Platform.WEB)).resolves.toBeDefined()
        await expect(service.getAuthUrl(OAuth2Platform.DESKTOP)).rejects.toThrow()
        await expect(service.getAuthUrl(OAuth2Platform.ANDROID)).rejects.toThrow()
        await expect(service.getAuthUrl(OAuth2Platform.IOS)).rejects.toThrow()
      })
    })

    describe('error handling', () => {
      it('should handle cache set failures', async () => {
        // Arrange
        const platform = OAuth2Platform.WEB
        const cacheError = new Error('Cache unavailable')
        cache.set.mockRejectedValue(cacheError)

        // Act & Assert
        await expect(service.getAuthUrl(platform)).rejects.toThrow(cacheError)
      })

      it('should handle buildAuthUrl failures', async () => {
        // Arrange
        const platform = OAuth2Platform.WEB
        const authUrlError = new Error('Failed to build auth URL')

        // Override buildAuthUrl to throw error
        service.buildAuthUrl = jest.fn().mockRejectedValue(authUrlError)
        cache.set.mockResolvedValue()

        // Act & Assert
        await expect(service.getAuthUrl(platform)).rejects.toThrow(authUrlError)
      })
    })
  })

  describe('verify', () => {
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

    const createMockUserProfile = (overrides: Partial<UserProfile> = {}): UserProfile => {
      return {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        avatarUrl: faker.image.avatar(),
        ...overrides,
      }
    }

    const createMockSession = (overrides: Partial<OAuthSession> = {}): OAuthSession => {
      return {
        state: faker.string.uuid(),
        provider: OAuth2Provider.GOOGLE,
        platform: OAuth2Platform.WEB,
        codeVerifier: faker.string.alphanumeric(43),
        ...overrides,
      }
    }

    describe('successful verification scenarios', () => {
      it('should verify OAuth session and return existing user', async () => {
        // Arrange
        const state = faker.string.uuid()
        const code = faker.string.alphanumeric(32)
        const mockSession = createMockSession({ state })
        const mockUser = createMockUser()
        const mockUserProfile = createMockUserProfile({ email: mockUser.email })

        cache.get.mockResolvedValue(mockSession)
        userRepository.findByEmail.mockResolvedValue(mockUser)
        cache.delete.mockResolvedValue()

        // Override getUserProfile for this test
        service.getUserProfile = jest.fn().mockResolvedValue(mockUserProfile)

        // Act
        const result = await service.verify(state, code)

        // Assert
        expect(result).toEqual([mockUser, mockSession.platform])
        expect(cache.get).toHaveBeenCalledWith(`oauth:google:${state}`)
        expect(service.getUserProfile).toHaveBeenCalledWith(code, mockSession.codeVerifier)
        expect(userRepository.findByEmail).toHaveBeenCalledWith(mockUserProfile.email)
        expect(cache.delete).toHaveBeenCalledWith(state)
        expect(userService.createUser).not.toHaveBeenCalled()
      })

      it('should create new user when user does not exist', async () => {
        // Arrange
        const state = faker.string.uuid()
        const code = faker.string.alphanumeric(32)
        const mockSession = createMockSession({ state })
        const mockUserProfile = createMockUserProfile()
        const mockNewUser = createMockUser({ email: mockUserProfile.email })
        const mockAvatarStream = new Readable()

        cache.get.mockResolvedValue(mockSession)
        userRepository.findByEmail.mockResolvedValue(null)
        userService.createUser.mockResolvedValue(mockNewUser)
        userService.putUserAvatar.mockResolvedValue()
        httpService.get.mockReturnValue(of({ data: mockAvatarStream } as any))
        cache.delete.mockResolvedValue()

        service.getUserProfile = jest.fn().mockResolvedValue(mockUserProfile)

        // Act
        const result = await service.verify(state, code)

        // Assert
        expect(result).toEqual([mockNewUser, mockSession.platform])
        expect(userService.createUser).toHaveBeenCalledWith(
          expect.objectContaining({
            name: mockUserProfile.name,
            email: mockUserProfile.email,
          })
        )
        expect(userService.putUserAvatar).toHaveBeenCalledWith(mockNewUser.id, mockAvatarStream)
        expect(httpService.get).toHaveBeenCalledWith(mockUserProfile.avatarUrl, {
          responseType: 'stream'
        })
      })

      it('should handle session without codeVerifier', async () => {
        // Arrange
        const state = faker.string.uuid()
        const code = faker.string.alphanumeric(32)
        const mockSession = createMockSession({ state, codeVerifier: undefined })
        const mockUser = createMockUser()
        const mockUserProfile = createMockUserProfile({ email: mockUser.email })

        cache.get.mockResolvedValue(mockSession)
        userRepository.findByEmail.mockResolvedValue(mockUser)
        cache.delete.mockResolvedValue()

        service.getUserProfile = jest.fn().mockResolvedValue(mockUserProfile)

        // Act
        const result = await service.verify(state, code)

        // Assert
        expect(result).toEqual([mockUser, mockSession.platform])
        expect(service.getUserProfile).toHaveBeenCalledWith(code, undefined)
      })

      it('should handle different OAuth2 platforms', async () => {
        // Arrange
        const platforms = [OAuth2Platform.WEB, OAuth2Platform.DESKTOP, OAuth2Platform.ANDROID, OAuth2Platform.IOS]

        for (const platform of platforms) {
          const state = faker.string.uuid()
          const code = faker.string.alphanumeric(32)
          const mockSession = createMockSession({ state, platform })
          const mockUser = createMockUser()
          const mockUserProfile = createMockUserProfile({ email: mockUser.email })

          cache.get.mockResolvedValue(mockSession)
          userRepository.findByEmail.mockResolvedValue(mockUser)
          cache.delete.mockResolvedValue()

          service.getUserProfile = jest.fn().mockResolvedValue(mockUserProfile)

          // Act
          const result = await service.verify(state, code)

          // Assert
          expect(result).toEqual([mockUser, platform])

          // Reset mocks for next iteration
          jest.clearAllMocks()
        }
      })
    })

    describe('error handling', () => {
      it('should throw BadRequestException for invalid session state', async () => {
        // Arrange
        const state = faker.string.uuid()
        const code = faker.string.alphanumeric(32)

        cache.get.mockResolvedValue(null)

        // Act & Assert
        await expect(service.verify(state, code)).rejects.toThrow(BadRequestException)

        const error = await service.verify(state, code).catch(err => err)
        expect(error.getResponse()).toEqual(
          plainToInstance(CommonResponseDto, {
            message: "Invalid OAuth session state.",
          })
        )
      })

      it('should propagate getUserProfile errors', async () => {
        // Arrange
        const state = faker.string.uuid()
        const code = faker.string.alphanumeric(32)
        const mockSession = createMockSession({ state })
        const profileError = new Error('Failed to get user profile')

        cache.get.mockResolvedValue(mockSession)
        service.getUserProfile = jest.fn().mockRejectedValue(profileError)

        // Act & Assert
        await expect(service.verify(state, code)).rejects.toThrow(profileError)
      })

      it('should propagate user creation errors', async () => {
        // Arrange
        const state = faker.string.uuid()
        const code = faker.string.alphanumeric(32)
        const mockSession = createMockSession({ state })
        const mockUserProfile = createMockUserProfile()
        const mockAvatarStream = new Readable()
        const userCreationError = new Error('Failed to create user')

        cache.get.mockResolvedValue(mockSession)
        userRepository.findByEmail.mockResolvedValue(null)
        httpService.get.mockReturnValue(of({ data: mockAvatarStream } as any))
        userService.createUser.mockRejectedValue(userCreationError)
        service.getUserProfile = jest.fn().mockResolvedValue(mockUserProfile)

        // Act & Assert
        await expect(service.verify(state, code)).rejects.toThrow(userCreationError)
      })

      it('should propagate avatar download errors', async () => {
        // Arrange
        const state = faker.string.uuid()
        const code = faker.string.alphanumeric(32)
        const mockSession = createMockSession({ state })
        const mockUserProfile = createMockUserProfile()
        const mockNewUser = createMockUser({ email: mockUserProfile.email })
        const avatarError = new Error('Failed to download avatar')

        cache.get.mockResolvedValue(mockSession)
        userRepository.findByEmail.mockResolvedValue(null)
        userService.createUser.mockResolvedValue(mockNewUser)
        httpService.get.mockImplementation(() => {
          throw avatarError
        })
        service.getUserProfile = jest.fn().mockResolvedValue(mockUserProfile)

        // Act & Assert
        await expect(service.verify(state, code)).rejects.toThrow(avatarError)
      })

      it('should handle cache deletion failures gracefully', async () => {
        // Arrange
        const state = faker.string.uuid()
        const code = faker.string.alphanumeric(32)
        const mockSession = createMockSession({ state })
        const mockUser = createMockUser()
        const mockUserProfile = createMockUserProfile({ email: mockUser.email })
        const cacheDeleteError = new Error('Cache delete failed')

        cache.get.mockResolvedValue(mockSession)
        userRepository.findByEmail.mockResolvedValue(mockUser)
        cache.delete.mockRejectedValue(cacheDeleteError)
        service.getUserProfile = jest.fn().mockResolvedValue(mockUserProfile)

        // Act & Assert
        await expect(service.verify(state, code)).rejects.toThrow(cacheDeleteError)
      })
    })
  })

  describe('verifyAndDecodeIdToken', () => {
    beforeEach(() => {
      // Reset JWKS options for each test
      service.setJwksOptions({
        jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
        cache: true,
        rateLimit: true,
      })
    })

    it('should throw error when JWKS options are not available', async () => {
      // Arrange
      service.setJwksOptions(null)
      const idToken = 'fake.id.token'

      // Act & Assert
      await expect(service.testVerifyAndDecodeIdToken(idToken)).rejects.toThrow(
        "JWKS client and options are not available."
      )
    })

    // Note: Testing JWT decode functionality requires more complex setup
    // This would typically be tested in integration tests rather than unit tests
  })

  describe('session management', () => {
    describe('session key generation', () => {
      it('should generate correct session keys for different providers', async () => {
        // Arrange
        const providers = [OAuth2Provider.GOOGLE, OAuth2Provider.MICROSOFT, OAuth2Provider.GITHUB]

        for (const provider of providers) {
          service.setProvider(provider)
          cache.set.mockResolvedValue()

          // Act
          await service.getAuthUrl(OAuth2Platform.WEB)

          // Assert
          const sessionKey = cache.set.mock.calls[0][0]
          const session = cache.set.mock.calls[0][1]
          const ttl = cache.set.mock.calls[0][2]

          expect(sessionKey).toMatch(new RegExp(`^oauth:${provider.toLowerCase()}:[a-f0-9]{64}$`))
          expect(session).toEqual(expect.objectContaining({
            provider,
            platform: OAuth2Platform.WEB,
            state: expect.any(String),
          }))
          expect(ttl).toBe(300)

          // Reset mock for next iteration
          jest.clearAllMocks()
        }
      })

      it('should use consistent session key format', async () => {
        // Arrange
        service.setProvider(OAuth2Provider.GOOGLE)
        cache.set.mockResolvedValue()

        // Act
        await service.getAuthUrl(OAuth2Platform.WEB)

        // Assert
        const sessionKey = cache.set.mock.calls[0][0]
        expect(sessionKey).toMatch(/^oauth:google:[a-f0-9]{64}$/)
      })
    })

    describe('session TTL', () => {
      it('should set session with 5 minute TTL', async () => {
        // Arrange
        service.setProvider(OAuth2Provider.GOOGLE)
        cache.set.mockResolvedValue()

        // Act
        await service.getAuthUrl(OAuth2Platform.WEB)

        // Assert
        expect(cache.set).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Object),
          300 // 5 minutes
        )
      })
    })
  })

  describe('PKCE implementation', () => {
    describe('code generation', () => {
      it('should generate secure random states', async () => {
        // Arrange
        cache.set.mockResolvedValue()

        // Act
        await service.getAuthUrl(OAuth2Platform.WEB)
        await service.getAuthUrl(OAuth2Platform.WEB)

        // Assert
        const session1 = cache.set.mock.calls[0][1] as OAuthSession
        const session2 = cache.set.mock.calls[1][1] as OAuthSession

        expect(session1.state).toHaveLength(64) // 32 bytes * 2 hex chars
        expect(session2.state).toHaveLength(64)
        expect(session1.state).not.toBe(session2.state)
        expect(session1.state).toMatch(/^[a-f0-9]{64}$/)
      })

      it('should generate base64url code verifiers when PKCE is supported', async () => {
        // Arrange
        service.setSupportsPKCE(true)
        cache.set.mockResolvedValue()

        // Act
        await service.getAuthUrl(OAuth2Platform.WEB)

        // Assert
        const session = cache.set.mock.calls[0][1] as OAuthSession
        expect(session.codeVerifier).toBeDefined()
        expect(session.codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/) // base64url pattern
      })

      it('should not generate code verifier when PKCE is not supported', async () => {
        // Arrange
        service.setSupportsPKCE(false)
        cache.set.mockResolvedValue()

        // Act
        await service.getAuthUrl(OAuth2Platform.WEB)

        // Assert
        const session = cache.set.mock.calls[0][1] as OAuthSession
        expect(session.codeVerifier).toBeUndefined()
      })
    })
  })

  describe('edge cases', () => {
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

    const createMockUserProfile = (overrides: Partial<UserProfile> = {}): UserProfile => {
      return {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        avatarUrl: faker.image.avatar(),
        ...overrides,
      }
    }

    const createMockSession = (overrides: Partial<OAuthSession> = {}): OAuthSession => {
      return {
        state: faker.string.uuid(),
        provider: OAuth2Provider.GOOGLE,
        platform: OAuth2Platform.WEB,
        codeVerifier: faker.string.alphanumeric(43),
        ...overrides,
      }
    }

    it('should handle empty or null cache responses', async () => {
      // Arrange
      const state = faker.string.uuid()
      const code = faker.string.alphanumeric(32)

      cache.get.mockResolvedValue(undefined)

      // Act & Assert
      await expect(service.verify(state, code)).rejects.toThrow(BadRequestException)
    })

    it('should handle malformed session data', async () => {
      // Arrange
      const state = faker.string.uuid()
      const code = faker.string.alphanumeric(32)

      cache.get.mockResolvedValue({} as OAuthSession) // Malformed session

      // Act & Assert
      await expect(service.verify(state, code)).rejects.toThrow()
    })

    it('should handle concurrent session operations', async () => {
      // Arrange
      const platform = OAuth2Platform.WEB
      cache.set.mockResolvedValue()

      // Act
      const promises = Array(5).fill(null).map(() => service.getAuthUrl(platform))
      const results = await Promise.all(promises)

      // Assert
      expect(results).toHaveLength(5)
      expect(cache.set).toHaveBeenCalledTimes(5)

      // Each URL should be unique
      const uniqueUrls = new Set(results)
      expect(uniqueUrls.size).toBe(5)
    })

    it('should handle very long user profile data', async () => {
      // Arrange
      const state = faker.string.uuid()
      const code = faker.string.alphanumeric(32)
      const mockSession = createMockSession({ state })
      const mockUser = createMockUser()
      const mockUserProfile = createMockUserProfile({
        name: 'A'.repeat(1000), // Very long name
        email: mockUser.email,
        avatarUrl: 'https://example.com/' + 'a'.repeat(1000) + '.jpg'
      })

      cache.get.mockResolvedValue(mockSession)
      userRepository.findByEmail.mockResolvedValue(mockUser)
      cache.delete.mockResolvedValue()
      service.getUserProfile = jest.fn().mockResolvedValue(mockUserProfile)

      // Act
      const result = await service.verify(state, code)

      // Assert
      expect(result).toEqual([mockUser, mockSession.platform])
      expect(service.getUserProfile).toHaveBeenCalledWith(code, mockSession.codeVerifier)
    })
  })
})
