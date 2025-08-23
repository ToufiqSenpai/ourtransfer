import { BearerTokenGuard } from './bearer-token.guard'
import { AccessTokenJwt } from '../../infrastructure/security/jwt/access-token-jwt.interface'
import { ExecutionContext } from '@nestjs/common'
import { mock, MockProxy } from 'jest-mock-extended'
import { UnauthorizedException } from '@nestjs/common'
import { CommonResponseDto } from '@ourtransfer/dto'
import { plainToInstance } from 'class-transformer'

describe('BearerTokenGuard', () => {
  let guard: BearerTokenGuard
  let accessToken: MockProxy<AccessTokenJwt>
  let context: any

  beforeEach(() => {
    accessToken = mock<AccessTokenJwt>()
    guard = new BearerTokenGuard(accessToken)

    context = {
      switchToHttp: jest.fn().mockReturnThis(),
      getRequest: jest.fn(),
    }
  })

  function mockRequest(headers: Record<string, string> = {}) {
    const req: any = { headers }
    context.getRequest.mockReturnValue(req)
    return req as Request & { userId?: string }
  }

  const expectedUnauthorizedResponse = plainToInstance(CommonResponseDto, { message: 'Unauthorized.' })

  it('should throw UnauthorizedException if no Authorization header', async () => {
    mockRequest({})
    await expect(guard.canActivate(context as ExecutionContext)).rejects.toThrow(
      new UnauthorizedException(expectedUnauthorizedResponse),
    )
  })

  it('should throw UnauthorizedException if Authorization header is not Bearer', async () => {
    mockRequest({ authorization: 'Basic abcdef' })
    await expect(guard.canActivate(context as ExecutionContext)).rejects.toThrow(
      new UnauthorizedException(expectedUnauthorizedResponse),
    )
  })

  it('should throw UnauthorizedException if Authorization header has no token', async () => {
    mockRequest({ authorization: 'Bearer' })
    await expect(guard.canActivate(context as ExecutionContext)).rejects.toThrow(
      new UnauthorizedException(expectedUnauthorizedResponse),
    )
  })

  it('should throw UnauthorizedException if Authorization header has only whitespace as token', async () => {
    mockRequest({ authorization: 'Bearer  ' })
    await expect(guard.canActivate(context as ExecutionContext)).rejects.toThrow(
      new UnauthorizedException(expectedUnauthorizedResponse),
    )
  })

  it('should throw UnauthorizedException if accessToken.verify returns null', async () => {
    mockRequest({ authorization: 'Bearer sometoken' })
    accessToken.verify.mockResolvedValue(null)
    await expect(guard.canActivate(context as ExecutionContext)).rejects.toThrow(
      new UnauthorizedException(expectedUnauthorizedResponse),
    )
    expect(accessToken.verify).toHaveBeenCalledWith('sometoken')
  })

  it('should set userId on request and return true if token is valid', async () => {
    const req = mockRequest({ authorization: 'Bearer validtoken' })
    accessToken.verify.mockResolvedValue('user-123')
    const result = await guard.canActivate(context as ExecutionContext)
    expect(accessToken.verify).toHaveBeenCalledWith('validtoken')
    expect(req.userId).toBe('user-123')
    expect(result).toBe(true)
  })

  it('should re-throw an unexpected error from accessToken.verify', async () => {
    mockRequest({ authorization: 'Bearer sometoken' })
    const unexpectedError = new Error('Unexpected verification error')
    accessToken.verify.mockRejectedValue(unexpectedError)
    await expect(guard.canActivate(context as ExecutionContext)).rejects.toThrow(unexpectedError)
    expect(accessToken.verify).toHaveBeenCalledWith('sometoken')
  })

  it('should throw UnauthorizedException if Authorization header is malformed (e.g. no space)', async () => {
    mockRequest({ authorization: 'Bearertoken' })
    await expect(guard.canActivate(context as ExecutionContext)).rejects.toThrow(
      new UnauthorizedException(expectedUnauthorizedResponse),
    )
  })
})
