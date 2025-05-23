import { AccessTokenJwt } from './access-token.jwt'
import { mock, MockProxy } from 'jest-mock-extended'
import { ConfigService } from '@nestjs/config'
import { SecretManager } from '../../common/abstracts/secret-manager.abstract'
import { sign } from 'jsonwebtoken'

describe('AccessTokenJwt', () => {
  const mockSecret = 'test-secret'
  const mockDomain = 'http://localhost'
  let config: MockProxy<ConfigService>
  let secretManager: MockProxy<SecretManager>
  let jwt: AccessTokenJwt

  beforeEach(() => {
    config = mock<ConfigService>()
    config.get.mockImplementation((key: string) => (key === 'app.domain' ? mockDomain : undefined))

    secretManager = mock<SecretManager>()
    secretManager.getOrThrow.mockResolvedValue(mockSecret)

    jwt = new AccessTokenJwt(config, secretManager)
  })

  describe('sign', () => {
    it('should sign a token with the correct payload and header', async () => {
      const userId = 'user-123'
      const token = await jwt.sign(userId)
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3)
    })
  })

  describe('verify', () => {
    it('should verify a valid token and return the userId', async () => {
      const userId = 'user-456'
      const token = await jwt.sign(userId)
      const result = await jwt.verify(token)
      expect(result).toBe(userId)
    })

    it('should return null for a token with no sub', async () => {
      // Using jsonwebtoken directly instead of jose
      const token = sign({ foo: 'bar' }, mockSecret, {
        algorithm: 'HS256',
        issuer: mockDomain,
        audience: 'ourtransfer-client',
        expiresIn: '1h',
      })

      const result = await jwt.verify(token)
      expect(result).toBeNull()
    })

    it('should throw if token is invalid', async () => {
      await expect(jwt.verify('invalid.token.value')).rejects.toThrow()
    })
  })
})
