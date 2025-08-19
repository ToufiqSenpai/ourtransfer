import { Test, TestingModule } from '@nestjs/testing'
import { HttpService } from '@nestjs/axios'
import { mock, MockProxy } from 'jest-mock-extended'
import { faker } from '@faker-js/faker'
import { of } from 'rxjs'
import { GoogleOAuth2Service, GoogleGetTokenResponse, GoogleJwtPayload } from './google-oauth2.service'
import { Cache, CACHE } from '../../../infrastructure/cache/cache.interface'
import { UserService } from '../../user/services/user.service'
import { UserRepository } from '../../user/repositories/user.repository'
import { SecretManager } from '../../../infrastructure/secret/secret-manager.abstract'
import { OAuth2Provider } from '../enums/oauth2-provider.enum'
import { OAuth2Platform } from '../enums/oauth2-platform.enum'

/**
 * Unit tests for GoogleOAuth2Service
 *
 * Tests the Google OAuth2 service implementation including:
 * - Provider configuration and PKCE support
 * - JWKS options for Google endpoints
 * - Auth URL generation with Google-specific parameters
 * - Token exchange and user profile retrieval
 * - JWT token verification and payload extraction
 */
describe('GoogleOAuth2Service', () => {
  let service: GoogleOAuth2Service
  let cache: MockProxy<Cache>
  let _userService: MockProxy<UserService>
  let _userRepository: MockProxy<UserRepository>
  let httpService: MockProxy<HttpService>
  let secretManager: MockProxy<SecretManager>

  // Mock secrets
  const mockSecrets = {
    GOOGLE_CLIENT_ID: 'test-google-client-id',
    GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
    GOOGLE_REDIRECT_URI: 'http://localhost:3000/auth/google/callback',
  }

  // Helper functions for test data creation
  const createMockState = (): string => faker.string.uuid()
  const createMockCodeChallenge = (): string => faker.string.alphanumeric(43)
  const createMockCode = (): string => faker.string.alphanumeric(32)
  const createMockCodeVerifier = (): string => faker.string.alphanumeric(43)

  const createMockTokenResponse = (): GoogleGetTokenResponse => ({
    access_token: faker.string.alphanumeric(128),
    expires_in: 3600,
    refresh_token: faker.string.alphanumeric(128),
    scope: 'openid email profile',
    token_type: 'Bearer',
    id_token: faker.string.alphanumeric(256),
  })

  const createMockJwtPayload = (overrides: Partial<GoogleJwtPayload> = {}): GoogleJwtPayload => ({
    at_hash: faker.string.alphanumeric(22),
    azp: mockSecrets.GOOGLE_CLIENT_ID,
    email: faker.internet.email(),
    email_verified: true,
    family_name: faker.person.lastName(),
    given_name: faker.person.firstName(),
    name: faker.person.fullName(),
    picture: faker.image.avatar(),
    ...overrides,
  })

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleOAuth2Service,
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
        {
          provide: SecretManager,
          useValue: mock<SecretManager>(),
        },
      ],
    }).compile()

    service = module.get<GoogleOAuth2Service>(GoogleOAuth2Service)
    cache = module.get<MockProxy<Cache>>(CACHE)
    _userService = module.get<MockProxy<UserService>>(UserService)
    _userRepository = module.get<MockProxy<UserRepository>>(UserRepository)
    httpService = module.get<MockProxy<HttpService>>(HttpService)
    secretManager = module.get<MockProxy<SecretManager>>(SecretManager)

    // Setup default secret manager responses
    secretManager.getOrThrow.mockImplementation((key: string) => {
      const value = mockSecrets[key as keyof typeof mockSecrets]
      if (!value) {
        throw new Error(`Secret ${key} not found`)
      }
      return Promise.resolve(value)
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('provider configuration', () => {
    it('should return Google as the provider', () => {
      // Act
      const provider = service['provider']

      // Assert
      expect(provider).toBe(OAuth2Provider.GOOGLE)
    })

    it('should support PKCE', () => {
      // Act
      const supportsPKCE = service['supportsPKCE']

      // Assert
      expect(supportsPKCE).toBe(true)
    })

    it('should have correct JWKS options', () => {
      // Act
      const jwksOptions = service['jwksOptions']

      // Assert
      expect(jwksOptions).toEqual({
        jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
      })
    })
  })

  describe('buildAuthUrl', () => {
    describe('successful URL generation', () => {
      it('should build Google auth URL without PKCE', async () => {
        // Arrange
        const state = createMockState()

        // Act
        const result = await service['buildAuthUrl'](state)

        // Assert
        expect(result).toContain('https://accounts.google.com/o/oauth2/v2/auth')
        expect(result).toContain(`client_id=${mockSecrets.GOOGLE_CLIENT_ID}`)
        expect(result).toContain(`redirect_uri=${encodeURIComponent(mockSecrets.GOOGLE_REDIRECT_URI)}`)
        expect(result).toContain('response_type=code')
        expect(result).toContain('scope=openid+email+profile')
        expect(result).toContain('access_type=offline')
        expect(result).toContain('prompt=consent')
        expect(result).toContain(`state=${state}`)
        expect(result).not.toContain('code_challenge')
        expect(result).not.toContain('code_challenge_method')
      })

      it('should build Google auth URL with PKCE', async () => {
        // Arrange
        const state = createMockState()
        const codeChallenge = createMockCodeChallenge()

        // Act
        const result = await service['buildAuthUrl'](state, codeChallenge)

        // Assert
        expect(result).toContain('https://accounts.google.com/o/oauth2/v2/auth')
        expect(result).toContain(`client_id=${mockSecrets.GOOGLE_CLIENT_ID}`)
        expect(result).toContain(`redirect_uri=${encodeURIComponent(mockSecrets.GOOGLE_REDIRECT_URI)}`)
        expect(result).toContain('response_type=code')
        expect(result).toContain('scope=openid+email+profile')
        expect(result).toContain('access_type=offline')
        expect(result).toContain('prompt=consent')
        expect(result).toContain(`state=${state}`)
        expect(result).toContain(`code_challenge=${codeChallenge}`)
        expect(result).toContain('code_challenge_method=S256')
      })

      it('should generate different URLs for different states', async () => {
        // Arrange
        const state1 = createMockState()
        const state2 = createMockState()

        // Act
        const result1 = await service['buildAuthUrl'](state1)
        const result2 = await service['buildAuthUrl'](state2)

        // Assert
        expect(result1).not.toBe(result2)
        expect(result1).toContain(`state=${state1}`)
        expect(result2).toContain(`state=${state2}`)
      })

      it('should handle special characters in state parameter', async () => {
        // Arrange
        const specialState = 'state-with_special.characters'

        // Act
        const result = await service['buildAuthUrl'](specialState)

        // Assert
        expect(result).toContain(`state=${specialState}`)
      })

      it('should generate valid URL object', async () => {
        // Arrange
        const state = createMockState()
        const codeChallenge = createMockCodeChallenge()

        // Act
        const result = await service['buildAuthUrl'](state, codeChallenge)

        // Assert
        expect(() => new URL(result)).not.toThrow()

        const url = new URL(result)
        expect(url.protocol).toBe('https:')
        expect(url.hostname).toBe('accounts.google.com')
        expect(url.pathname).toBe('/o/oauth2/v2/auth')
      })

      it('should include Google-specific parameters', async () => {
        // Arrange
        const state = createMockState()

        // Act
        const result = await service['buildAuthUrl'](state)

        // Assert
        expect(result).toContain('access_type=offline')
        expect(result).toContain('prompt=consent')
      })
    })

    describe('error handling', () => {
      it('should handle secret manager errors', async () => {
        // Arrange
        const state = createMockState()
        secretManager.getOrThrow.mockRejectedValue(new Error('Secret not found'))

        // Act & Assert
        await expect(service['buildAuthUrl'](state)).rejects.toThrow('Secret not found')
      })

      it('should handle missing client ID secret', async () => {
        // Arrange
        const state = createMockState()
        secretManager.getOrThrow.mockImplementation((key: string) => {
          if (key === 'GOOGLE_CLIENT_ID') {
            throw new Error('GOOGLE_CLIENT_ID not found')
          }
          return Promise.resolve(mockSecrets[key as keyof typeof mockSecrets] || '')
        })

        // Act & Assert
        await expect(service['buildAuthUrl'](state)).rejects.toThrow('GOOGLE_CLIENT_ID not found')
      })

      it('should handle missing redirect URI secret', async () => {
        // Arrange
        const state = createMockState()
        secretManager.getOrThrow.mockImplementation((key: string) => {
          if (key === 'GOOGLE_REDIRECT_URI') {
            throw new Error('GOOGLE_REDIRECT_URI not found')
          }
          return Promise.resolve(mockSecrets[key as keyof typeof mockSecrets] || '')
        })

        // Act & Assert
        await expect(service['buildAuthUrl'](state)).rejects.toThrow('GOOGLE_REDIRECT_URI not found')
      })
    })
  })

  describe('getUserProfile', () => {
    describe('successful profile retrieval', () => {
      it('should retrieve user profile without code verifier', async () => {
        // Arrange
        const code = createMockCode()
        const mockTokenResponse = createMockTokenResponse()
        const mockJwtPayload = createMockJwtPayload()

        httpService.post.mockReturnValue(of({ data: mockTokenResponse } as any))

        // Mock the verifyAndDecodeIdToken method
        jest.spyOn(service as any, 'verifyAndDecodeIdToken').mockResolvedValue(mockJwtPayload)

        // Act
        const result = await service['getUserProfile'](code)

        // Assert
        expect(result).toEqual({
          email: mockJwtPayload.email,
          name: mockJwtPayload.name,
          avatarUrl: mockJwtPayload.picture,
        })

        // Verify HTTP call
        expect(httpService.post).toHaveBeenCalledWith(
          'https://oauth2.googleapis.com/token',
          expect.stringContaining('grant_type=authorization_code'),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        )

        // Verify token URL parameters
        const tokenRequestBody = httpService.post.mock.calls[0][1] as string
        expect(tokenRequestBody).toContain(`client_id=${mockSecrets.GOOGLE_CLIENT_ID}`)
        expect(tokenRequestBody).toContain(`client_secret=${mockSecrets.GOOGLE_CLIENT_SECRET}`)
        expect(tokenRequestBody).toContain('grant_type=authorization_code')
        expect(tokenRequestBody).toContain(`code=${code}`)
        expect(tokenRequestBody).toContain(`redirect_uri=${encodeURIComponent(mockSecrets.GOOGLE_REDIRECT_URI)}`)
        expect(tokenRequestBody).not.toContain('code_verifier')
      })

      it('should retrieve user profile with code verifier', async () => {
        // Arrange
        const code = createMockCode()
        const codeVerifier = createMockCodeVerifier()
        const mockTokenResponse = createMockTokenResponse()
        const mockJwtPayload = createMockJwtPayload()

        httpService.post.mockReturnValue(of({ data: mockTokenResponse } as any))
        jest.spyOn(service as any, 'verifyAndDecodeIdToken').mockResolvedValue(mockJwtPayload)

        // Act
        const result = await service['getUserProfile'](code, codeVerifier)

        // Assert
        expect(result).toEqual({
          email: mockJwtPayload.email,
          name: mockJwtPayload.name,
          avatarUrl: mockJwtPayload.picture,
        })

        // Verify token request includes code verifier
        const tokenRequestBody = httpService.post.mock.calls[0][1] as string
        expect(tokenRequestBody).toContain(`code_verifier=${codeVerifier}`)
      })

      it('should verify JWT token with correct options', async () => {
        // Arrange
        const code = createMockCode()
        const mockTokenResponse = createMockTokenResponse()
        const mockJwtPayload = createMockJwtPayload()

        httpService.post.mockReturnValue(of({ data: mockTokenResponse } as any))
        const verifyAndDecodeIdTokenSpy = jest.spyOn(service as any, 'verifyAndDecodeIdToken').mockResolvedValue(mockJwtPayload)

        // Act
        await service['getUserProfile'](code)

        // Assert
        expect(verifyAndDecodeIdTokenSpy).toHaveBeenCalledWith(
          mockTokenResponse.id_token,
          {
            audience: mockSecrets.GOOGLE_CLIENT_ID,
          }
        )
      })

      it('should handle different user profile data formats', async () => {
        // Arrange
        const testCases = [
          {
            name: 'John Doe',
            email: 'john.doe@gmail.com',
            picture: 'https://example.com/avatar1.jpg',
            given_name: 'John',
            family_name: 'Doe',
          },
          {
            name: 'Jane Smith-Wilson',
            email: 'jane.smith.wilson@company.com',
            picture: 'https://cdn.example.com/profiles/jane_avatar.png',
            given_name: 'Jane',
            family_name: 'Smith-Wilson',
          },
          {
            name: 'José García',
            email: 'jose.garcia@empresa.com',
            picture: 'https://images.example.com/users/jose.jpg',
            given_name: 'José',
            family_name: 'García',
          },
        ]

        for (const testCase of testCases) {
          const code = createMockCode()
          const mockTokenResponse = createMockTokenResponse()
          const mockJwtPayload = createMockJwtPayload(testCase)

          httpService.post.mockReturnValue(of({ data: mockTokenResponse } as any))
          jest.spyOn(service as any, 'verifyAndDecodeIdToken').mockResolvedValue(mockJwtPayload)

          // Act
          const result = await service['getUserProfile'](code)

          // Assert
          expect(result).toEqual({
            email: testCase.email,
            name: testCase.name,
            avatarUrl: testCase.picture,
          })

          // Reset mocks for next iteration
          jest.clearAllMocks()
        }
      })

      it('should handle Google-specific profile fields', async () => {
        // Arrange
        const code = createMockCode()
        const mockTokenResponse = createMockTokenResponse()
        const mockJwtPayload = createMockJwtPayload({
          email_verified: true,
          at_hash: 'test-hash',
          azp: mockSecrets.GOOGLE_CLIENT_ID,
        })

        httpService.post.mockReturnValue(of({ data: mockTokenResponse } as any))
        jest.spyOn(service as any, 'verifyAndDecodeIdToken').mockResolvedValue(mockJwtPayload)

        // Act
        const result = await service['getUserProfile'](code)

        // Assert
        expect(result).toEqual({
          email: mockJwtPayload.email,
          name: mockJwtPayload.name,
          avatarUrl: mockJwtPayload.picture,
        })
      })
    })

    describe('error handling', () => {
      it('should handle token exchange HTTP errors', async () => {
        // Arrange
        const code = createMockCode()
        const httpError = new Error('HTTP request failed')

        httpService.post.mockImplementation(() => {
          throw httpError
        })

        // Act & Assert
        await expect(service['getUserProfile'](code)).rejects.toThrow(httpError)
      })

      it('should handle JWT verification errors', async () => {
        // Arrange
        const code = createMockCode()
        const mockTokenResponse = createMockTokenResponse()
        const jwtError = new Error('Invalid JWT token')

        httpService.post.mockReturnValue(of({ data: mockTokenResponse } as any))
        jest.spyOn(service as any, 'verifyAndDecodeIdToken').mockRejectedValue(jwtError)

        // Act & Assert
        await expect(service['getUserProfile'](code)).rejects.toThrow(jwtError)
      })

      it('should handle missing token response', async () => {
        // Arrange
        const code = createMockCode()

        httpService.post.mockReturnValue(of({ data: null } as any))

        // Act & Assert
        await expect(service['getUserProfile'](code)).rejects.toThrow()
      })

      it('should handle malformed token response', async () => {
        // Arrange
        const code = createMockCode()
        const malformedResponse = { invalid: 'response' }

        httpService.post.mockReturnValue(of({ data: malformedResponse } as any))

        // Act & Assert
        await expect(service['getUserProfile'](code)).rejects.toThrow()
      })

      it('should handle secret manager errors during token exchange', async () => {
        // Arrange
        const code = createMockCode()
        secretManager.getOrThrow.mockRejectedValue(new Error('Secret unavailable'))

        // Act & Assert
        await expect(service['getUserProfile'](code)).rejects.toThrow('Secret unavailable')
      })

      it('should handle network timeout errors', async () => {
        // Arrange
        const code = createMockCode()
        const timeoutError = new Error('Network timeout')

        httpService.post.mockImplementation(() => {
          throw timeoutError
        })

        // Act & Assert
        await expect(service['getUserProfile'](code)).rejects.toThrow(timeoutError)
      })

      it('should handle Google API rate limiting', async () => {
        // Arrange
        const code = createMockCode()
        const rateLimitError = new Error('Rate limit exceeded')

        httpService.post.mockImplementation(() => {
          throw rateLimitError
        })

        // Act & Assert
        await expect(service['getUserProfile'](code)).rejects.toThrow(rateLimitError)
      })
    })
  })

  describe('integration scenarios', () => {
    it('should work with the inherited OAuth2Service methods', async () => {
      // Arrange
      cache.set.mockResolvedValue()
      cache.get.mockResolvedValue(null)

      // Act & Assert - testing that the service can be used with OAuth2Platform enum
      await expect(service.getAuthUrl(OAuth2Platform.WEB)).resolves.toBeDefined()
    })

    it('should handle concurrent profile requests', async () => {
      // Arrange
      const codes = Array(3).fill(null).map(() => createMockCode())
      const mockTokenResponse = createMockTokenResponse()
      const mockJwtPayload = createMockJwtPayload()

      httpService.post.mockReturnValue(of({ data: mockTokenResponse } as any))
      jest.spyOn(service as any, 'verifyAndDecodeIdToken').mockResolvedValue(mockJwtPayload)

      // Act
      const promises = codes.map(code => service['getUserProfile'](code))
      const results = await Promise.all(promises)

      // Assert
      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result).toEqual({
          email: mockJwtPayload.email,
          name: mockJwtPayload.name,
          avatarUrl: mockJwtPayload.picture,
        })
      })
      expect(httpService.post).toHaveBeenCalledTimes(3)
    })

    it('should preserve Google-specific JWT payload fields', async () => {
      // Arrange
      const code = createMockCode()
      const mockTokenResponse = createMockTokenResponse()
      const mockJwtPayload = createMockJwtPayload({
        at_hash: 'specific-hash-value',
        azp: 'authorized-party-client-id',
        email_verified: true,
      })

      httpService.post.mockReturnValue(of({ data: mockTokenResponse } as any))
      const verifyAndDecodeIdTokenSpy = jest.spyOn(service as any, 'verifyAndDecodeIdToken').mockResolvedValue(mockJwtPayload)

      // Act
      await service['getUserProfile'](code)

      // Assert
      expect(verifyAndDecodeIdTokenSpy).toHaveBeenCalledWith(
        mockTokenResponse.id_token,
        expect.objectContaining({
          audience: mockSecrets.GOOGLE_CLIENT_ID,
        })
      )
    })
  })

  describe('secret management', () => {
    it('should call secret manager for all required secrets', async () => {
      // Arrange
      const state = faker.string.uuid()

      // Act
      await service['buildAuthUrl'](state)

      // Assert
      expect(secretManager.getOrThrow).toHaveBeenCalledWith('GOOGLE_CLIENT_ID')
      expect(secretManager.getOrThrow).toHaveBeenCalledWith('GOOGLE_REDIRECT_URI')
    })

    it('should call secret manager for token exchange secrets', async () => {
      // Arrange
      const code = createMockCode()
      const mockTokenResponse = createMockTokenResponse()
      const mockJwtPayload = createMockJwtPayload()

      httpService.post.mockReturnValue(of({ data: mockTokenResponse } as any))
      jest.spyOn(service as any, 'verifyAndDecodeIdToken').mockResolvedValue(mockJwtPayload)

      // Act
      await service['getUserProfile'](code)

      // Assert
      expect(secretManager.getOrThrow).toHaveBeenCalledWith('GOOGLE_CLIENT_ID')
      expect(secretManager.getOrThrow).toHaveBeenCalledWith('GOOGLE_CLIENT_SECRET')
      expect(secretManager.getOrThrow).toHaveBeenCalledWith('GOOGLE_REDIRECT_URI')
    })

    it('should handle different secret manager implementations', async () => {
      // Arrange
      const customSecrets = {
        GOOGLE_CLIENT_ID: 'custom-client-id',
        GOOGLE_CLIENT_SECRET: 'custom-client-secret',
        GOOGLE_REDIRECT_URI: 'https://custom.domain.com/callback',
      }

      secretManager.getOrThrow.mockImplementation((key: string) => {
        return Promise.resolve(customSecrets[key as keyof typeof customSecrets] || '')
      })

      const state = faker.string.uuid()

      // Act
      const result = await service['buildAuthUrl'](state)

      // Assert
      expect(result).toContain(`client_id=${customSecrets.GOOGLE_CLIENT_ID}`)
      expect(result).toContain(`redirect_uri=${encodeURIComponent(customSecrets.GOOGLE_REDIRECT_URI)}`)
    })
  })

  describe('Google-specific scenarios', () => {
    it('should handle Google Workspace accounts', async () => {
      // Arrange
      const workspaceAccounts = [
        { email: 'user@company.com', name: 'Workspace User' },
        { email: 'admin@organization.org', name: 'Admin User' },
        { email: 'employee@business.net', name: 'Employee' },
      ]

      for (const account of workspaceAccounts) {
        const code = createMockCode()
        const mockTokenResponse = createMockTokenResponse()
        const mockJwtPayload = createMockJwtPayload(account)

        httpService.post.mockReturnValue(of({ data: mockTokenResponse } as any))
        jest.spyOn(service as any, 'verifyAndDecodeIdToken').mockResolvedValue(mockJwtPayload)

        // Act
        const result = await service['getUserProfile'](code)

        // Assert
        expect(result).toEqual({
          email: account.email,
          name: account.name,
          avatarUrl: mockJwtPayload.picture,
        })

        // Reset mocks for next iteration
        jest.clearAllMocks()
      }
    })

    it('should handle personal Gmail accounts', async () => {
      // Arrange
      const personalAccounts = [
        { email: 'user@gmail.com', name: 'Personal User' },
        { email: 'someone@googlemail.com', name: 'GoogleMail User' },
      ]

      for (const account of personalAccounts) {
        const code = createMockCode()
        const mockTokenResponse = createMockTokenResponse()
        const mockJwtPayload = createMockJwtPayload(account)

        httpService.post.mockReturnValue(of({ data: mockTokenResponse } as any))
        jest.spyOn(service as any, 'verifyAndDecodeIdToken').mockResolvedValue(mockJwtPayload)

        // Act
        const result = await service['getUserProfile'](code)

        // Assert
        expect(result).toEqual({
          email: account.email,
          name: account.name,
          avatarUrl: mockJwtPayload.picture,
        })

        // Reset mocks for next iteration
        jest.clearAllMocks()
      }
    })

    it('should handle verified and unverified email accounts', async () => {
      // Arrange
      const verificationStates = [true, false]

      for (const emailVerified of verificationStates) {
        const code = createMockCode()
        const mockTokenResponse = createMockTokenResponse()
        const mockJwtPayload = createMockJwtPayload({ email_verified: emailVerified })

        httpService.post.mockReturnValue(of({ data: mockTokenResponse } as any))
        jest.spyOn(service as any, 'verifyAndDecodeIdToken').mockResolvedValue(mockJwtPayload)

        // Act
        const result = await service['getUserProfile'](code)

        // Assert
        expect(result).toEqual({
          email: mockJwtPayload.email,
          name: mockJwtPayload.name,
          avatarUrl: mockJwtPayload.picture,
        })

        // Reset mocks for next iteration
        jest.clearAllMocks()
      }
    })
  })

  describe('edge cases', () => {
    it('should handle very long state parameters', async () => {
      // Arrange
      const longState = 'a'.repeat(1000)

      // Act
      const result = await service['buildAuthUrl'](longState)

      // Assert
      expect(result).toContain(`state=${longState}`)
    })

    it('should handle special characters in secrets', async () => {
      // Arrange
      const specialSecrets = {
        GOOGLE_CLIENT_ID: 'client-id-with-special-chars!@#$%',
        GOOGLE_REDIRECT_URI: 'https://example.com/callback?param=value&other=test',
      }

      secretManager.getOrThrow.mockImplementation((key: string) => {
        return Promise.resolve(specialSecrets[key as keyof typeof specialSecrets] || mockSecrets[key as keyof typeof mockSecrets])
      })

      const state = faker.string.uuid()

      // Act
      const result = await service['buildAuthUrl'](state)

      // Assert
      expect(result).toContain('client-id-with-special-chars%21%40%23%24%25')
      expect(result).toContain(encodeURIComponent(specialSecrets.GOOGLE_REDIRECT_URI))
    })

    it('should handle empty code parameter', async () => {
      // Arrange
      const emptyCode = ''
      const mockTokenResponse = createMockTokenResponse()

      httpService.post.mockReturnValue(of({ data: mockTokenResponse } as any))

      // Act
      // Test that empty code is handled
      await service['getUserProfile'](emptyCode).catch(() => {
        // Expected to potentially fail with empty code
      })

      // Assert that the method attempts to make the call
      expect(secretManager.getOrThrow).toHaveBeenCalled()
    })

    it('should handle missing profile picture', async () => {
      // Arrange
      const code = createMockCode()
      const mockTokenResponse = createMockTokenResponse()
      const mockJwtPayload = createMockJwtPayload({ picture: undefined })

      httpService.post.mockReturnValue(of({ data: mockTokenResponse } as any))
      jest.spyOn(service as any, 'verifyAndDecodeIdToken').mockResolvedValue(mockJwtPayload)

      // Act
      const result = await service['getUserProfile'](code)

      // Assert
      expect(result).toEqual({
        email: mockJwtPayload.email,
        name: mockJwtPayload.name,
        avatarUrl: undefined,
      })
    })

    it('should handle Unicode characters in names', async () => {
      // Arrange
      const code = createMockCode()
      const mockTokenResponse = createMockTokenResponse()
      const mockJwtPayload = createMockJwtPayload({
        name: '张三 李四',
        given_name: '三',
        family_name: '张',
      })

      httpService.post.mockReturnValue(of({ data: mockTokenResponse } as any))
      jest.spyOn(service as any, 'verifyAndDecodeIdToken').mockResolvedValue(mockJwtPayload)

      // Act
      const result = await service['getUserProfile'](code)

      // Assert
      expect(result).toEqual({
        email: mockJwtPayload.email,
        name: '张三 李四',
        avatarUrl: mockJwtPayload.picture,
      })
    })
  })
})
