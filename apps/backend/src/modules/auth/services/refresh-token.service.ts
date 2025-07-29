import { User } from '../../user/entities/user.entity'
import { RefreshToken } from '../entities/refresh-token.entity'

export const REFRESH_TOKEN_SERVICE = Symbol('RefreshTokenService')

export interface RefreshTokenService {
  create(user: User, userAgent: string, ipAddress: string): Promise<RefreshToken>
  verify(refreshToken: string, userAgent: string): Promise<boolean>
}
