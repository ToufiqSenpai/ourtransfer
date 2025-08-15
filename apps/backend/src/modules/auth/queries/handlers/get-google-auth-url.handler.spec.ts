import { Test, TestingModule } from '@nestjs/testing'
import { mock, MockProxy } from 'jest-mock-extended'
import { faker } from '@faker-js/faker'
import { GetGoogleAuthUrlHandler } from './get-google-auth-url.handler'
import { GetGoogleAuthUrlQuery } from '../get-google-auth-url.query'
import { GoogleOAuth2Service } from '../../services/google-oauth2.service'
import { GoogleAuthResponseDto } from '@ourtransfer/dto'
import { OAuth2Platform } from '../../enums/oauth2-platform.enum'

/**
 * Unit tests for GetGoogleAuthUrlHandler
 *
 * Tests the query handler responsible for generating Google OAuth2 authentication URLs:
 * - Retrieving auth URLs for different platforms
 * - Proper DTO construction and response format
 * - Error handling for service failures
 * - Platform-specific URL generation
 */
describe('GetGoogleAuthUrlHandler', () => {
  let handler: GetGoogleAuthUrlHandler
  let googleOAuth2Service: MockProxy<GoogleOAuth2Service>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetGoogleAuthUrlHandler,
        {
          provide: GoogleOAuth2Service,
          useValue: mock<GoogleOAuth2Service>(),
        },
      ],
    }).compile()

    handler = module.get<GetGoogleAuthUrlHandler>(GetGoogleAuthUrlHandler)
    googleOAuth2Service = module.get<MockProxy<GoogleOAuth2Service>>(GoogleOAuth2Service)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    const createQuery = (platform: OAuth2Platform): GetGoogleAuthUrlQuery => {
      return new GetGoogleAuthUrlQuery(platform)
    }

    const generateMockGoogleAuthUrl = (): string => {
      const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
      const params = new URLSearchParams({
        client_id: faker.string.uuid(),
        redirect_uri: faker.internet.url(),
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
        state: faker.string.uuid(),
        code_challenge: faker.string.alphanumeric(43),
        code_challenge_method: 'S256',
      })
      return `${baseUrl}?${params.toString()}`
    }

    describe('successful URL generation scenarios', () => {
      it('should generate Google auth URL for web platform', async () => {
        // Arrange
        const platform = OAuth2Platform.WEB
        const query = createQuery(platform)
        const mockUrl = generateMockGoogleAuthUrl()

        googleOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        const result = await handler.execute(query)

        // Assert
        expect(googleOAuth2Service.getAuthUrl).toHaveBeenCalledWith(platform)
        expect(result).toBeInstanceOf(GoogleAuthResponseDto)
        expect(result.url).toBe(mockUrl)
      })

      it('should generate Google auth URL for desktop platform', async () => {
        // Arrange
        const platform = OAuth2Platform.DESKTOP
        const query = createQuery(platform)
        const mockUrl = generateMockGoogleAuthUrl()

        googleOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        const result = await handler.execute(query)

        // Assert
        expect(googleOAuth2Service.getAuthUrl).toHaveBeenCalledWith(platform)
        expect(result).toBeInstanceOf(GoogleAuthResponseDto)
        expect(result.url).toBe(mockUrl)
      })

      it('should generate Google auth URL for Android platform', async () => {
        // Arrange
        const platform = OAuth2Platform.ANDROID
        const query = createQuery(platform)
        const mockUrl = generateMockGoogleAuthUrl()

        googleOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        const result = await handler.execute(query)

        // Assert
        expect(googleOAuth2Service.getAuthUrl).toHaveBeenCalledWith(platform)
        expect(result).toBeInstanceOf(GoogleAuthResponseDto)
        expect(result.url).toBe(mockUrl)
      })

      it('should generate Google auth URL for iOS platform', async () => {
        // Arrange
        const platform = OAuth2Platform.IOS
        const query = createQuery(platform)
        const mockUrl = generateMockGoogleAuthUrl()

        googleOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        const result = await handler.execute(query)

        // Assert
        expect(googleOAuth2Service.getAuthUrl).toHaveBeenCalledWith(platform)
        expect(result).toBeInstanceOf(GoogleAuthResponseDto)
        expect(result.url).toBe(mockUrl)
      })

      it('should handle all OAuth2Platform enum values', async () => {
        // Arrange
        const platforms = [OAuth2Platform.WEB, OAuth2Platform.DESKTOP, OAuth2Platform.ANDROID, OAuth2Platform.IOS]

        for (const platform of platforms) {
          const query = createQuery(platform)
          const mockUrl = generateMockGoogleAuthUrl()

          googleOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

          // Act
          const result = await handler.execute(query)

          // Assert
          expect(googleOAuth2Service.getAuthUrl).toHaveBeenCalledWith(platform)
          expect(result.url).toBe(mockUrl)

          // Reset mock for next iteration
          jest.clearAllMocks()
        }
      })

      it('should return different URLs for different platforms', async () => {
        // Arrange
        const webQuery = createQuery(OAuth2Platform.WEB)
        const desktopQuery = createQuery(OAuth2Platform.DESKTOP)
        const webUrl = generateMockGoogleAuthUrl()
        const desktopUrl = generateMockGoogleAuthUrl()

        googleOAuth2Service.getAuthUrl
          .mockResolvedValueOnce(webUrl)
          .mockResolvedValueOnce(desktopUrl)

        // Act
        const webResult = await handler.execute(webQuery)
        const desktopResult = await handler.execute(desktopQuery)

        // Assert
        expect(googleOAuth2Service.getAuthUrl).toHaveBeenCalledTimes(2)
        expect(googleOAuth2Service.getAuthUrl).toHaveBeenNthCalledWith(1, OAuth2Platform.WEB)
        expect(googleOAuth2Service.getAuthUrl).toHaveBeenNthCalledWith(2, OAuth2Platform.DESKTOP)
        expect(webResult.url).toBe(webUrl)
        expect(desktopResult.url).toBe(desktopUrl)
        expect(webResult.url).not.toBe(desktopResult.url)
      })
    })

    describe('response DTO construction', () => {
      it('should create and populate GoogleAuthResponseDto correctly', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const mockUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&state=test123'

        googleOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        const result = await handler.execute(query)

        // Assert
        expect(result).toBeInstanceOf(GoogleAuthResponseDto)
        expect(result).toHaveProperty('url')
        expect(result.url).toBe(mockUrl)
      })

      it('should handle various URL formats correctly', async () => {
        // Arrange
        const testUrls = [
          'https://accounts.google.com/o/oauth2/v2/auth?simple=true',
          'https://accounts.google.com/o/oauth2/v2/auth?client_id=123&redirect_uri=http%3A//localhost%3A3000/callback&state=xyz',
          generateMockGoogleAuthUrl(),
          'https://accounts.google.com/o/oauth2/v2/auth?' + 'x'.repeat(1000), // Very long URL
        ]

        for (const url of testUrls) {
          const query = createQuery(OAuth2Platform.WEB)
          googleOAuth2Service.getAuthUrl.mockResolvedValue(url)

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
        const testCases = [
          '',
          'invalid-url',
          'http://localhost',
          'https://example.com/path?query=value',
        ]

        for (const url of testCases) {
          const query = createQuery(OAuth2Platform.WEB)
          googleOAuth2Service.getAuthUrl.mockResolvedValue(url)

          // Act
          const result = await handler.execute(query)

          // Assert
          expect(result.url).toBe(url)

          // Reset mock for next iteration
          jest.clearAllMocks()
        }
      })
    })

    describe('error handling', () => {
      it('should propagate errors from googleOAuth2Service.getAuthUrl', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const serviceError = new Error('Failed to generate Google auth URL')

        googleOAuth2Service.getAuthUrl.mockRejectedValue(serviceError)

        // Act & Assert
        await expect(handler.execute(query)).rejects.toThrow(serviceError)
        expect(googleOAuth2Service.getAuthUrl).toHaveBeenCalledWith(OAuth2Platform.WEB)
      })

      it('should handle network timeout errors', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.DESKTOP)
        const timeoutError = new Error('Network timeout')

        googleOAuth2Service.getAuthUrl.mockRejectedValue(timeoutError)

        // Act & Assert
        await expect(handler.execute(query)).rejects.toThrow(timeoutError)
      })

      it('should handle configuration errors', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.ANDROID)
        const configError = new Error('Missing Google OAuth2 configuration')

        googleOAuth2Service.getAuthUrl.mockRejectedValue(configError)

        // Act & Assert
        await expect(handler.execute(query)).rejects.toThrow(configError)
      })

      it('should handle service unavailability errors', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.IOS)
        const serviceUnavailableError = new Error('Google OAuth2 service unavailable')

        googleOAuth2Service.getAuthUrl.mockRejectedValue(serviceUnavailableError)

        // Act & Assert
        await expect(handler.execute(query)).rejects.toThrow(serviceUnavailableError)
      })

      it('should handle unexpected errors gracefully', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const unexpectedError = new Error('Unexpected error occurred')

        googleOAuth2Service.getAuthUrl.mockRejectedValue(unexpectedError)

        // Act & Assert
        await expect(handler.execute(query)).rejects.toThrow(unexpectedError)
      })
    })

    describe('service integration', () => {
      it('should call googleOAuth2Service.getAuthUrl with correct parameters', async () => {
        // Arrange
        const platform = OAuth2Platform.WEB
        const query = createQuery(platform)
        const mockUrl = generateMockGoogleAuthUrl()

        googleOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        await handler.execute(query)

        // Assert
        expect(googleOAuth2Service.getAuthUrl).toHaveBeenCalledTimes(1)
        expect(googleOAuth2Service.getAuthUrl).toHaveBeenCalledWith(platform)
      })

      it('should not call any other service methods', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const mockUrl = generateMockGoogleAuthUrl()

        googleOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        await handler.execute(query)

        // Assert
        expect(googleOAuth2Service.getAuthUrl).toHaveBeenCalledTimes(1)
        // Verify no other methods were called by checking all mock calls
        const allCalls = Object.keys(googleOAuth2Service).filter(key =>
          typeof googleOAuth2Service[key as keyof typeof googleOAuth2Service] === 'function' &&
          key !== 'getAuthUrl'
        )

        for (const methodName of allCalls) {
          const method = googleOAuth2Service[methodName as keyof typeof googleOAuth2Service] as jest.Mock
          expect(method).not.toHaveBeenCalled()
        }
      })

      it('should handle multiple successive calls correctly', async () => {
        // Arrange
        const platforms = [OAuth2Platform.WEB, OAuth2Platform.DESKTOP, OAuth2Platform.ANDROID]
        const urls = platforms.map(() => generateMockGoogleAuthUrl())

        platforms.forEach((platform, index) => {
          googleOAuth2Service.getAuthUrl.mockResolvedValueOnce(urls[index])
        })

        // Act
        const results: GoogleAuthResponseDto[] = []
        for (const platform of platforms) {
          const query = createQuery(platform)
          const result = await handler.execute(query)
          results.push(result)
        }

        // Assert
        expect(googleOAuth2Service.getAuthUrl).toHaveBeenCalledTimes(3)
        platforms.forEach((platform, index) => {
          expect(googleOAuth2Service.getAuthUrl).toHaveBeenNthCalledWith(index + 1, platform)
          expect(results[index].url).toBe(urls[index])
        })
      })
    })

    describe('edge cases', () => {
      it('should handle query with platform as different enum values', async () => {
        // Arrange
        const platforms = Object.values(OAuth2Platform)

        for (const platform of platforms) {
          const query = createQuery(platform)
          const mockUrl = generateMockGoogleAuthUrl()

          googleOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

          // Act
          const result = await handler.execute(query)

          // Assert
          expect(result.url).toBe(mockUrl)
          expect(googleOAuth2Service.getAuthUrl).toHaveBeenCalledWith(platform)

          // Reset mock for next iteration
          jest.clearAllMocks()
        }
      })

      it('should handle very long URLs from service', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const longUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
          'parameter=' + 'a'.repeat(10000) // Very long parameter

        googleOAuth2Service.getAuthUrl.mockResolvedValue(longUrl)

        // Act
        const result = await handler.execute(query)

        // Assert
        expect(result.url).toBe(longUrl)
        expect(result.url.length).toBeGreaterThan(10000)
      })

      it('should handle URLs with special characters', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const specialCharUrl = 'https://accounts.google.com/o/oauth2/v2/auth?state=test%20with%20spaces&redirect_uri=http%3A//localhost%3A3000/callback%3Ftest%3Dtrue'

        googleOAuth2Service.getAuthUrl.mockResolvedValue(specialCharUrl)

        // Act
        const result = await handler.execute(query)

        // Assert
        expect(result.url).toBe(specialCharUrl)
      })

      it('should handle concurrent requests for same platform', async () => {
        // Arrange
        const platform = OAuth2Platform.WEB
        const mockUrl = generateMockGoogleAuthUrl()
        const concurrentRequests = 5

        googleOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        const promises = Array(concurrentRequests).fill(null).map(() => {
          const query = createQuery(platform)
          return handler.execute(query)
        })

        const results = await Promise.all(promises)

        // Assert
        expect(googleOAuth2Service.getAuthUrl).toHaveBeenCalledTimes(concurrentRequests)
        results.forEach(result => {
          expect(result.url).toBe(mockUrl)
        })
      })

      it('should handle concurrent requests for different platforms', async () => {
        // Arrange
        const platforms = [OAuth2Platform.WEB, OAuth2Platform.DESKTOP, OAuth2Platform.ANDROID]
        const urls = platforms.map(() => generateMockGoogleAuthUrl())

        platforms.forEach((platform, index) => {
          googleOAuth2Service.getAuthUrl.mockResolvedValueOnce(urls[index])
        })

        // Act
        const promises = platforms.map(platform => {
          const query = createQuery(platform)
          return handler.execute(query)
        })

        const results = await Promise.all(promises)

        // Assert
        expect(googleOAuth2Service.getAuthUrl).toHaveBeenCalledTimes(3)
        results.forEach((result, index) => {
          expect(result.url).toBe(urls[index])
        })
      })
    })

    describe('performance and reliability', () => {
      it('should handle service delays gracefully', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const mockUrl = generateMockGoogleAuthUrl()
        const delay = 100 // 100ms delay

        googleOAuth2Service.getAuthUrl.mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, delay))
          return mockUrl
        })

        // Act
        const startTime = Date.now()
        const result = await handler.execute(query)
        const endTime = Date.now()

        // Assert
        expect(result.url).toBe(mockUrl)
        expect(endTime - startTime).toBeGreaterThanOrEqual(delay)
      })

      it('should not modify the input query object', async () => {
        // Arrange
        const platform = OAuth2Platform.WEB
        const query = createQuery(platform)
        const originalPlatform = query.platform
        const mockUrl = generateMockGoogleAuthUrl()

        googleOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        await handler.execute(query)

        // Assert
        expect(query.platform).toBe(originalPlatform)
      })

      it('should create new DTO instance for each call', async () => {
        // Arrange
        const query = createQuery(OAuth2Platform.WEB)
        const mockUrl = generateMockGoogleAuthUrl()

        googleOAuth2Service.getAuthUrl.mockResolvedValue(mockUrl)

        // Act
        const result1 = await handler.execute(query)
        const result2 = await handler.execute(query)

        // Assert
        expect(result1).not.toBe(result2) // Different object instances
        expect(result1.url).toBe(result2.url) // Same URL content
        expect(result1).toEqual(result2) // Same structure and values
      })
    })
  })
})
