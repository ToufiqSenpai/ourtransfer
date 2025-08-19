import { Test, TestingModule } from '@nestjs/testing'
import { mock, MockProxy } from 'jest-mock-extended'
import { faker } from '@faker-js/faker'
import { GetMicrosoftAuthUrlHandler } from './get-microsoft-auth-url.handler'
import { GetMicrosoftAuthUrlQuery } from '../get-microsoft-auth-url.query'
import { MicrosoftOAuth2Service } from '../../services/microsoft-oauth2.service'
import { MicrosoftAuthResponseDto } from '@ourtransfer/dto'
import { OAuth2Platform } from '../../enums/oauth2-platform.enum'

/**
 * Unit tests for GetMicrosoftAuthUrlHandler
 *
 * Tests the CQRS query handler responsible for generating Microsoft OAuth2 auth URLs.
 * Covers various platform scenarios, error handling, and DTO construction.
 */
describe('GetMicrosoftAuthUrlHandler', () => {
  let handler: GetMicrosoftAuthUrlHandler
  let microsoftOAuth2Service: MockProxy<MicrosoftOAuth2Service>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMicrosoftAuthUrlHandler,
        {
          provide: MicrosoftOAuth2Service,
          useValue: mock<MicrosoftOAuth2Service>(),
        },
      ],
    }).compile()

    handler = module.get<GetMicrosoftAuthUrlHandler>(GetMicrosoftAuthUrlHandler)
    microsoftOAuth2Service = module.get<MockProxy<MicrosoftOAuth2Service>>(MicrosoftOAuth2Service)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    const createQuery = (platform: OAuth2Platform): GetMicrosoftAuthUrlQuery => {
      return new GetMicrosoftAuthUrlQuery(platform)
    }

    const generateMockMicrosoftAuthUrl = (): string => {
      const baseUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
      const params = new URLSearchParams({
        client_id: faker.string.uuid(),
        redirect_uri: faker.internet.url(),
        response_type: 'code',
        scope: 'openid email profile',
        response_mode: 'query',
        state: faker.string.uuid(),
        prompt: 'select_account',
        code_challenge: faker.string.alphanumeric(43),
        code_challenge_method: 'S256',
      })
      return `${baseUrl}?${params.toString()}`
    }

    describe('successful URL generation scenarios', () => {
      it('should generate Microsoft auth URL for web platform', async () => {
        // Arrange
        const platform = OAuth2Platform.WEB
        const query = createQuery(platform)
        const mockUrl = generateMockMicrosoftAuthUrl()

        microsoftOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        const result = await handler.execute(query)

        // Assert
        expect(microsoftOAuth2Service.getAuthUrl).toHaveBeenCalledWith(platform)
        expect(result).toBeInstanceOf(MicrosoftAuthResponseDto)
        expect(result.url).toBe(mockUrl)
      })

      it('should generate Microsoft auth URL for desktop platform', async () => {
        // Arrange
        const platform = OAuth2Platform.DESKTOP
        const query = createQuery(platform)
        const mockUrl = generateMockMicrosoftAuthUrl()

        microsoftOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        const result = await handler.execute(query)

        // Assert
        expect(microsoftOAuth2Service.getAuthUrl).toHaveBeenCalledWith(platform)
        expect(result).toBeInstanceOf(MicrosoftAuthResponseDto)
        expect(result.url).toBe(mockUrl)
      })

      it('should generate Microsoft auth URL for Android platform', async () => {
        // Arrange
        const platform = OAuth2Platform.ANDROID
        const query = createQuery(platform)
        const mockUrl = generateMockMicrosoftAuthUrl()

        microsoftOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        const result = await handler.execute(query)

        // Assert
        expect(microsoftOAuth2Service.getAuthUrl).toHaveBeenCalledWith(platform)
        expect(result).toBeInstanceOf(MicrosoftAuthResponseDto)
        expect(result.url).toBe(mockUrl)
      })

      it('should generate Microsoft auth URL for iOS platform', async () => {
        // Arrange
        const platform = OAuth2Platform.IOS
        const query = createQuery(platform)
        const mockUrl = generateMockMicrosoftAuthUrl()

        microsoftOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        const result = await handler.execute(query)

        // Assert
        expect(microsoftOAuth2Service.getAuthUrl).toHaveBeenCalledWith(platform)
        expect(result).toBeInstanceOf(MicrosoftAuthResponseDto)
        expect(result.url).toBe(mockUrl)
      })

      it('should handle all OAuth2Platform enum values', async () => {
        // Arrange
        const platforms = [OAuth2Platform.WEB, OAuth2Platform.DESKTOP, OAuth2Platform.ANDROID, OAuth2Platform.IOS]

        for (const platform of platforms) {
          const query = createQuery(platform)
          const mockUrl = generateMockMicrosoftAuthUrl()

          microsoftOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

          // Act
          const result = await handler.execute(query)

          // Assert
          expect(microsoftOAuth2Service.getAuthUrl).toHaveBeenCalledWith(platform)
          expect(result.url).toBe(mockUrl)

          // Reset mock for next iteration
          jest.clearAllMocks()
        }
      })

      it('should return different URLs for different platforms', async () => {
        // Arrange
        const webQuery = createQuery(OAuth2Platform.WEB)
        const desktopQuery = createQuery(OAuth2Platform.DESKTOP)
        const webUrl = generateMockMicrosoftAuthUrl()
        const desktopUrl = generateMockMicrosoftAuthUrl()

        microsoftOAuth2Service.getAuthUrl
          .mockResolvedValueOnce(webUrl)
          .mockResolvedValueOnce(desktopUrl)

        // Act
        const webResult = await handler.execute(webQuery)
        const desktopResult = await handler.execute(desktopQuery)

        // Assert
        expect(microsoftOAuth2Service.getAuthUrl).toHaveBeenCalledTimes(2)
        expect(microsoftOAuth2Service.getAuthUrl).toHaveBeenNthCalledWith(1, OAuth2Platform.WEB)
        expect(microsoftOAuth2Service.getAuthUrl).toHaveBeenNthCalledWith(2, OAuth2Platform.DESKTOP)
        expect(webResult.url).toBe(webUrl)
        expect(desktopResult.url).toBe(desktopUrl)
        expect(webResult.url).not.toBe(desktopResult.url)
      })
    })

    describe('response DTO construction', () => {
      it('should create and populate MicrosoftAuthResponseDto correctly', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const mockUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=test&state=test123'

        microsoftOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        const result = await handler.execute(query)

        // Assert
        expect(result).toBeInstanceOf(MicrosoftAuthResponseDto)
        expect(result).toHaveProperty('url')
        expect(result.url).toBe(mockUrl)
      })

      it('should handle various URL formats correctly', async () => {
        // Arrange
        const testUrls = [
          'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?simple=true',
          'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=123&redirect_uri=http%3A//localhost%3A3000/callback&state=xyz',
          generateMockMicrosoftAuthUrl(),
          'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?' + 'x'.repeat(1000), // Very long URL
        ]

        for (const url of testUrls) {
          const query = createQuery(OAuth2Platform.WEB)
          microsoftOAuth2Service.getAuthUrl.mockResolvedValue(url)

          // Act
          const result = await handler.execute(query)

          // Assert
          expect(result.url).toBe(url)

          // Reset mock for next iteration
          jest.clearAllMocks()
        }
      })

      it('should handle empty or unusual URLs from service', async () => {
        // Arrange
        const unusualUrls = [
          '',
          ' ',
          'not-a-url',
          'ftp://example.com',
          'https://example.com',
        ]

        for (const url of unusualUrls) {
          const query = createQuery(OAuth2Platform.WEB)
          microsoftOAuth2Service.getAuthUrl.mockResolvedValue(url)

          // Act
          const result = await handler.execute(query)

          // Assert
          expect(result.url).toBe(url)
          expect(result).toBeInstanceOf(MicrosoftAuthResponseDto)

          // Reset mock for next iteration
          jest.clearAllMocks()
        }
      })
    })

    describe('service interaction', () => {
      it('should call MicrosoftOAuth2Service with correct parameters', async () => {
        // Arrange
        const platform = OAuth2Platform.WEB
        const query = createQuery(platform)
        const mockUrl = generateMockMicrosoftAuthUrl()

        microsoftOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        await handler.execute(query)

        // Assert
        expect(microsoftOAuth2Service.getAuthUrl).toHaveBeenCalledTimes(1)
        expect(microsoftOAuth2Service.getAuthUrl).toHaveBeenCalledWith(platform)
      })

      it('should pass through service response without modification', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const serviceResponse = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?test=value'

        microsoftOAuth2Service.getAuthUrl.mockResolvedValue(serviceResponse)

        // Act
        const result = await handler.execute(query)

        // Assert
        expect(result.url).toBe(serviceResponse)
      })

      it('should handle service method being called multiple times', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const mockUrl = generateMockMicrosoftAuthUrl()

        microsoftOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        await handler.execute(query)
        await handler.execute(query)
        await handler.execute(query)

        // Assert
        expect(microsoftOAuth2Service.getAuthUrl).toHaveBeenCalledTimes(3)
      })
    })

    describe('error handling', () => {
      it('should propagate service errors', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const serviceError = new Error('Service unavailable')

        microsoftOAuth2Service.getAuthUrl.mockRejectedValue(serviceError)

        // Act & Assert
        await expect(handler.execute(query)).rejects.toThrow(serviceError)
      })

      it('should handle different types of service errors', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const errors = [
          new Error('Network timeout'),
          new Error('Invalid configuration'),
          new Error('Secret not found'),
          new TypeError('Invalid parameter'),
        ]

        for (const error of errors) {
          microsoftOAuth2Service.getAuthUrl.mockRejectedValue(error)

          // Act & Assert
          await expect(handler.execute(query)).rejects.toThrow(error)

          // Reset mock for next iteration
          jest.clearAllMocks()
        }
      })

      it('should handle service throwing non-Error objects', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const nonErrorObject = { message: 'Something went wrong', code: 500 }

        microsoftOAuth2Service.getAuthUrl.mockRejectedValue(nonErrorObject)

        // Act & Assert
        await expect(handler.execute(query)).rejects.toBe(nonErrorObject)
      })
    })

    describe('edge cases', () => {
      it('should handle query with platform as different enum values', async () => {
        // Arrange
        const platforms = Object.values(OAuth2Platform)

        for (const platform of platforms) {
          const query = createQuery(platform)
          const mockUrl = generateMockMicrosoftAuthUrl()

          microsoftOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

          // Act
          const result = await handler.execute(query)

          // Assert
          expect(result.url).toBe(mockUrl)
          expect(microsoftOAuth2Service.getAuthUrl).toHaveBeenCalledWith(platform)

          // Reset mock for next iteration
          jest.clearAllMocks()
        }
      })

      it('should handle very long URLs from service', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const longUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?' +
          'parameter=' + 'a'.repeat(10000) // Very long parameter

        microsoftOAuth2Service.getAuthUrl.mockResolvedValue(longUrl)

        // Act
        const result = await handler.execute(query)

        // Assert
        expect(result.url).toBe(longUrl)
        expect(result.url.length).toBeGreaterThan(10000)
      })

      it('should handle URLs with special characters', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const specialCharUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?state=test%20with%20spaces&redirect_uri=http%3A//localhost%3A3000/callback%3Ftest%3Dtrue'

        microsoftOAuth2Service.getAuthUrl.mockResolvedValue(specialCharUrl)

        // Act
        const result = await handler.execute(query)

        // Assert
        expect(result.url).toBe(specialCharUrl)
      })

      it('should handle concurrent requests for same platform', async () => {
        // Arrange
        const platform = OAuth2Platform.WEB
        const mockUrl = generateMockMicrosoftAuthUrl()
        const concurrentRequests = 5

        microsoftOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        const promises = Array(concurrentRequests).fill(null).map(() => {
          const query = createQuery(platform)
          return handler.execute(query)
        })

        const results = await Promise.all(promises)

        // Assert
        expect(microsoftOAuth2Service.getAuthUrl).toHaveBeenCalledTimes(concurrentRequests)
        results.forEach(result => {
          expect(result.url).toBe(mockUrl)
        })
      })

      it('should handle concurrent requests for different platforms', async () => {
        // Arrange
        const platforms = [OAuth2Platform.WEB, OAuth2Platform.DESKTOP, OAuth2Platform.ANDROID]
        const urls = platforms.map(() => generateMockMicrosoftAuthUrl())

        platforms.forEach((platform, index) => {
          microsoftOAuth2Service.getAuthUrl.mockResolvedValueOnce(urls[index])
        })

        // Act
        const promises = platforms.map(platform => {
          const query = createQuery(platform)
          return handler.execute(query)
        })

        const results = await Promise.all(promises)

        // Assert
        expect(microsoftOAuth2Service.getAuthUrl).toHaveBeenCalledTimes(platforms.length)
        results.forEach((result, index) => {
          expect(result.url).toBe(urls[index])
        })
      })
    })

    describe('Microsoft-specific URL validation', () => {
      it('should handle Microsoft OAuth2 endpoint URLs', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const microsoftUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?' +
          'client_id=test&redirect_uri=http%3A//localhost%3A3000/callback&' +
          'response_type=code&scope=openid+email+profile&response_mode=query&' +
          'state=test123&prompt=select_account&code_challenge=abcd&code_challenge_method=S256'

        microsoftOAuth2Service.getAuthUrl.mockResolvedValue(microsoftUrl)

        // Act
        const result = await handler.execute(query)

        // Assert
        expect(result.url).toBe(microsoftUrl)
        expect(result.url).toContain('login.microsoftonline.com')
        expect(result.url).toContain('oauth2/v2.0/authorize')
      })

      it('should handle Microsoft tenant-specific URLs', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const tenantUrl = 'https://login.microsoftonline.com/12345678-1234-1234-1234-123456789012/oauth2/v2.0/authorize?client_id=test'

        microsoftOAuth2Service.getAuthUrl.mockResolvedValue(tenantUrl)

        // Act
        const result = await handler.execute(query)

        // Assert
        expect(result.url).toBe(tenantUrl)
        expect(result.url).toContain('12345678-1234-1234-1234-123456789012')
      })
    })

    describe('integration scenarios', () => {
      it('should not modify the input query object', async () => {
        // Arrange
        const platform = OAuth2Platform.WEB
        const query = createQuery(platform)
        const originalPlatform = query.platform
        const mockUrl = generateMockMicrosoftAuthUrl()

        microsoftOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        await handler.execute(query)

        // Assert
        expect(query.platform).toBe(originalPlatform)
      })

      it('should create new DTO instance for each call', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const mockUrl = generateMockMicrosoftAuthUrl()

        microsoftOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        const result1 = await handler.execute(query)
        const result2 = await handler.execute(query)

        // Assert
        expect(result1).not.toBe(result2) // Different object instances
        expect(result1.url).toBe(result2.url) // Same URL content
        expect(result1).toBeInstanceOf(MicrosoftAuthResponseDto)
        expect(result2).toBeInstanceOf(MicrosoftAuthResponseDto)
      })

      it('should work with the CQRS pattern correctly', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const mockUrl = generateMockMicrosoftAuthUrl()

        microsoftOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        const result = await handler.execute(query)

        // Assert
        expect(result).toBeDefined()
        expect(typeof result.url).toBe('string')
        expect(microsoftOAuth2Service.getAuthUrl).toHaveBeenCalled()
      })
    })

    describe('performance considerations', () => {
      it('should handle rapid sequential calls efficiently', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const mockUrl = generateMockMicrosoftAuthUrl()
        const callCount = 100

        microsoftOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        const startTime = Date.now()
        for (let i = 0; i < callCount; i++) {
          await handler.execute(query)
        }
        const endTime = Date.now()

        // Assert
        expect(microsoftOAuth2Service.getAuthUrl).toHaveBeenCalledTimes(callCount)
        expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
      })

      it('should handle large URLs without memory issues', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const largeUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?' +
          'large_parameter=' + 'x'.repeat(1000000) // 1MB parameter

        microsoftOAuth2Service.getAuthUrl.mockResolvedValue(largeUrl)

        // Act
        const result = await handler.execute(query)

        // Assert
        expect(result.url).toBe(largeUrl)
        expect(result.url.length).toBeGreaterThan(1000000)
      })
    })
  })
})
