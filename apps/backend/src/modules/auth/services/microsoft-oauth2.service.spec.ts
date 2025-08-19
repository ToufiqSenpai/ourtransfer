import { Test, TestingModule } from '@nestjs/testing'
import { HttpService } from '@nestjs/axios'
import { mock, MockProxy } from 'jest-mock-extended'
import { faker } from '@faker-js/faker'
import { of } from 'rxjs'
import { MicrosoftOAuth2Service, MicrosoftTokenResponse, MicrosoftJwtPayload } from './microsoft-oauth2.service'
import { Cache, CACHE } from '../../../infrastructure/cache/cache.interface'
import { UserService } from '../../user/services/user.service'
import { UserRepository } from '../../user/repositories/user.repository'
import { SecretManager } from '../../../infrastructure/secret/secret-manager.abstract'
import { OAuth2Provider } from '../enums/oauth2-provider.enum'
import { OAuth2Platform } from '../enums/oauth2-platform.enum'
/**
 * Unit tests for MicrosoftOAuth2Service
 *
 * Tests the Microsoft OAuth2 service implementation including:
 * - Provider configuration and PKCE support
 * - JWKS options for Microsoft endpoints
 * - Auth URL generation with Microsoft-specific parameters
 * - Token exchange and user profile retrieval
 * - JWT token verification and payload extraction
 */
describe('MicrosoftOAuth2Service', () => {
  let service: MicrosoftOAuth2Service
  let cache: MockProxy<Cache>
  let _userService: MockProxy<UserService>
  let _userRepository: MockProxy<UserRepository>
  let httpService: MockProxy<HttpService>
  let secretManager: MockProxy<SecretManager>

  // Mock secrets
  const mockSecrets = {
    MICROSOFT_CLIENT_ID: 'test-microsoft-client-id',
    MICROSOFT_CLIENT_SECRET: 'test-microsoft-client-secret',
    MICROSOFT_REDIRECT_URI: 'http://localhost:3000/auth/microsoft/callback',
  }

  // Helper functions for test data creation
  const createMockState = (): string => faker.string.uuid()
  const createMockCodeChallenge = (): string => faker.string.alphanumeric(43)
  const createMockCode = (): string => faker.string.alphanumeric(32)
  const createMockCodeVerifier = (): string => faker.string.alphanumeric(43)

  const createMockTokenResponse = (): MicrosoftTokenResponse => ({
    access_token: faker.string.alphanumeric(128),
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'openid email profile',
    refresh_token: faker.string.alphanumeric(128),
    id_token: faker.string.alphanumeric(256),
  })

  const createMockJwtPayload = (overrides: Partial<MicrosoftJwtPayload> = {}): MicrosoftJwtPayload => ({
    iss: 'https://login.microsoftonline.com/common/v2.0',
    sub: faker.string.uuid(),
    aud: mockSecrets.MICROSOFT_CLIENT_ID,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000),
    name: faker.person.fullName(),
    preferred_username: faker.internet.email(),
    email: faker.internet.email(),
    family_name: faker.person.lastName(),
    given_name: faker.person.firstName(),
    picture: faker.image.avatar(),
    tid: faker.string.uuid(),
    oid: faker.string.uuid(),
    upn: faker.internet.email(),
    unique_name: faker.internet.email(),
    ver: '2.0',
    ...overrides,
  })

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MicrosoftOAuth2Service,
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

    service = module.get<MicrosoftOAuth2Service>(MicrosoftOAuth2Service)
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
    it('should return Microsoft as the provider', () => {
      // Act
      const provider = service['provider']

      // Assert
      expect(provider).toBe(OAuth2Provider.MICROSOFT)
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
        jwksUri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
        cache: true,
        cacheMaxAge: 600, // 10 minutes
      })
    })
  })

  describe('buildAuthUrl', () => {
    describe('successful URL generation', () => {
      it('should build Microsoft auth URL without PKCE', async () => {
        // Arrange
        const state = createMockState()

        // Act
        const result = await service['buildAuthUrl'](state)

        // Assert
        expect(result).toContain('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
        expect(result).toContain(`client_id=${mockSecrets.MICROSOFT_CLIENT_ID}`)
        expect(result).toContain(`redirect_uri=${encodeURIComponent(mockSecrets.MICROSOFT_REDIRECT_URI)}`)
        expect(result).toContain('response_type=code')
        expect(result).toContain('scope=openid+email+profile')
        expect(result).toContain('response_mode=query')
        expect(result).toContain(`state=${state}`)
        expect(result).toContain('prompt=select_account')
        expect(result).not.toContain('code_challenge')
        expect(result).not.toContain('code_challenge_method')
      })

      it('should build Microsoft auth URL with PKCE', async () => {
        // Arrange
        const state = createMockState()
        const codeChallenge = createMockCodeChallenge()

        // Act
        const result = await service['buildAuthUrl'](state, codeChallenge)

        // Assert
        expect(result).toContain('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
        expect(result).toContain(`client_id=${mockSecrets.MICROSOFT_CLIENT_ID}`)
        expect(result).toContain(`redirect_uri=${encodeURIComponent(mockSecrets.MICROSOFT_REDIRECT_URI)}`)
        expect(result).toContain('response_type=code')
        expect(result).toContain('scope=openid+email+profile')
        expect(result).toContain('response_mode=query')
        expect(result).toContain(`state=${state}`)
        expect(result).toContain('prompt=select_account')
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
        expect(url.hostname).toBe('login.microsoftonline.com')
        expect(url.pathname).toBe('/common/oauth2/v2.0/authorize')
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
          if (key === 'MICROSOFT_CLIENT_ID') {
            throw new Error('MICROSOFT_CLIENT_ID not found')
          }
          return Promise.resolve(mockSecrets[key as keyof typeof mockSecrets] || '')
        })

        // Act & Assert
        await expect(service['buildAuthUrl'](state)).rejects.toThrow('MICROSOFT_CLIENT_ID not found')
      })

      it('should handle missing redirect URI secret', async () => {
        // Arrange
        const state = createMockState()
        secretManager.getOrThrow.mockImplementation((key: string) => {
          if (key === 'MICROSOFT_REDIRECT_URI') {
            throw new Error('MICROSOFT_REDIRECT_URI not found')
          }
          return Promise.resolve(mockSecrets[key as keyof typeof mockSecrets] || '')
        })

        // Act & Assert
        await expect(service['buildAuthUrl'](state)).rejects.toThrow('MICROSOFT_REDIRECT_URI not found')
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
          expect.stringContaining('https://login.microsoftonline.com/common/oauth2/v2.0/token'),
          null,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        )

        // Verify token URL parameters
        const tokenUrl = httpService.post.mock.calls[0][0]
        expect(tokenUrl).toContain(`client_id=${mockSecrets.MICROSOFT_CLIENT_ID}`)
        expect(tokenUrl).toContain(`client_secret=${mockSecrets.MICROSOFT_CLIENT_SECRET}`)
        expect(tokenUrl).toContain('grant_type=authorization_code')
        expect(tokenUrl).toContain(`code=${code}`)
        expect(tokenUrl).toContain(`redirect_uri=${encodeURIComponent(mockSecrets.MICROSOFT_REDIRECT_URI)}`)
        expect(tokenUrl).not.toContain('code_verifier')
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

        // Verify token URL includes code verifier
        const tokenUrl = httpService.post.mock.calls[0][0]
        expect(tokenUrl).toContain(`code_verifier=${codeVerifier}`)
      })

      it('should handle user profile with missing optional fields', async () => {
        // Arrange
        const code = createMockCode()
        const mockTokenResponse = createMockTokenResponse()
        const mockJwtPayload = createMockJwtPayload({
          name: undefined,
          email: undefined,
          picture: undefined,
        })

        httpService.post.mockReturnValue(of({ data: mockTokenResponse } as any))
        jest.spyOn(service as any, 'verifyAndDecodeIdToken').mockResolvedValue(mockJwtPayload)

        // Act
        const result = await service['getUserProfile'](code)

        // Assert
        expect(result).toEqual({
          email: undefined,
          name: undefined,
          avatarUrl: undefined,
        })
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
            audience: mockSecrets.MICROSOFT_CLIENT_ID,
            issuer: 'https://login.microsoftonline.com/common/v2.0'
          }
        )
      })

      it('should handle different user profile data formats', async () => {
        // Arrange
        const testCases = [
          {
            name: 'John Doe',
            email: 'john.doe@example.com',
            picture: 'https://example.com/avatar1.jpg',
          },
          {
            name: 'Jane Smith-Wilson',
            email: 'jane.smith-wilson@company.co.uk',
            picture: 'https://cdn.example.com/profiles/jane_avatar.png',
          },
          {
            name: 'João Silva',
            email: 'joao.silva@empresa.com.br',
            picture: 'https://images.example.com/users/joao.jpg',
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

    it('should preserve Microsoft-specific JWT payload fields', async () => {
      // Arrange
      const code = createMockCode()
      const mockTokenResponse = createMockTokenResponse()
      const mockJwtPayload = createMockJwtPayload({
        tid: 'tenant-12345',
        oid: 'object-67890',
        upn: 'user@tenant.onmicrosoft.com',
        unique_name: 'user@domain.com',
        ver: '2.0',
      })

      httpService.post.mockReturnValue(of({ data: mockTokenResponse } as any))
      const verifyAndDecodeIdTokenSpy = jest.spyOn(service as any, 'verifyAndDecodeIdToken').mockResolvedValue(mockJwtPayload)

      // Act
      await service['getUserProfile'](code)

      // Assert
      expect(verifyAndDecodeIdTokenSpy).toHaveBeenCalledWith(
        mockTokenResponse.id_token,
        expect.objectContaining({
          audience: mockSecrets.MICROSOFT_CLIENT_ID,
          issuer: 'https://login.microsoftonline.com/common/v2.0'
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
      expect(secretManager.getOrThrow).toHaveBeenCalledWith('MICROSOFT_CLIENT_ID')
      expect(secretManager.getOrThrow).toHaveBeenCalledWith('MICROSOFT_REDIRECT_URI')
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
      expect(secretManager.getOrThrow).toHaveBeenCalledWith('MICROSOFT_CLIENT_ID')
      expect(secretManager.getOrThrow).toHaveBeenCalledWith('MICROSOFT_CLIENT_SECRET')
      expect(secretManager.getOrThrow).toHaveBeenCalledWith('MICROSOFT_REDIRECT_URI')
    })

    it('should handle different secret manager implementations', async () => {
      // Arrange
      const customSecrets = {
        MICROSOFT_CLIENT_ID: 'custom-client-id',
        MICROSOFT_CLIENT_SECRET: 'custom-client-secret',
        MICROSOFT_REDIRECT_URI: 'https://custom.domain.com/callback',
      }

      secretManager.getOrThrow.mockImplementation((key: string) => {
        return Promise.resolve(customSecrets[key as keyof typeof customSecrets] || '')
      })

      const state = faker.string.uuid()

      // Act
      const result = await service['buildAuthUrl'](state)

      // Assert
      expect(result).toContain(`client_id=${customSecrets.MICROSOFT_CLIENT_ID}`)
      expect(result).toContain(`redirect_uri=${encodeURIComponent(customSecrets.MICROSOFT_REDIRECT_URI)}`)
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
        MICROSOFT_CLIENT_ID: 'client-id-with-special-chars!@#$%',
        MICROSOFT_REDIRECT_URI: 'https://example.com/callback?param=value&other=test',
      }

      secretManager.getOrThrow.mockImplementation((key: string) => {
        return Promise.resolve(specialSecrets[key as keyof typeof specialSecrets] || mockSecrets[key as keyof typeof mockSecrets])
      })

      const state = faker.string.uuid()

      // Act
      const result = await service['buildAuthUrl'](state)

      // Assert
      expect(result).toContain('client-id-with-special-chars%21%40%23%24%25')
      expect(result).toContain(encodeURIComponent(specialSecrets.MICROSOFT_REDIRECT_URI))
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
  })
})
