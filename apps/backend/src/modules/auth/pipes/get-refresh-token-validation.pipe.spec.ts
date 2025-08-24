import { GetRefreshTokenValidationPipe } from './get-refresh-token-validation.pipe'
import { GetRefreshTokenDto } from '@ourtransfer/dto'
import { Request } from 'express'

describe('RefreshValidationPipe', () => {
  const getMockRequest = (cookies: Record<string, string> = {}): any => ({ cookies }) as Request

  it('should transform valid refreshToken in body when no cookie is set', () => {
    const mockRequest = getMockRequest()
    const pipe = new GetRefreshTokenValidationPipe(mockRequest)
    const dto = pipe.transform({ refreshToken: 'sometoken' })
    expect(dto).toBeInstanceOf(GetRefreshTokenDto)
    expect(dto.refreshToken).toBe('sometoken')
  })

  it('should throw if refreshToken is missing and no cookie is set', () => {
    const mockRequest = getMockRequest()
    const pipe = new GetRefreshTokenValidationPipe(mockRequest)
    expect(() => pipe.transform({})).toThrow('Refresh token is required when cookies are not set.')
  })

  it('should throw if refreshToken is not a string and no cookie is set', () => {
    const mockRequest = getMockRequest()
    const pipe = new GetRefreshTokenValidationPipe(mockRequest)
    expect(() => pipe.transform({ refreshToken: 123 })).toThrow('Refresh token must be a string.')
  })

  it('should allow missing refreshToken if cookie is set', () => {
    const mockRequest = getMockRequest({ ['refreshToken']: 'cookie-token' })
    const pipe = new GetRefreshTokenValidationPipe(mockRequest)
    const dto = pipe.transform({})
    expect(dto).toBeInstanceOf(GetRefreshTokenDto)
    expect(dto.refreshToken).toBeUndefined()
  })

  it('should transform refreshToken from body even if cookie is set', () => {
    const mockRequest = getMockRequest({ ['refreshToken']: 'cookie-token' })
    const pipe = new GetRefreshTokenValidationPipe(mockRequest)
    const dto = pipe.transform({ refreshToken: 'body-token' })
    expect(dto.refreshToken).toBe('body-token')
  })
})
