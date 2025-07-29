import { RefreshTokenService } from './refresh-token.service'
import { Inject, Injectable } from '@nestjs/common'
import { RefreshToken } from '../entities/refresh-token.entity'
import { User } from '../../user/entities/user.entity'
import { randomBytes } from 'crypto'
import { ConfigService } from '@nestjs/config'
import { RefreshTokenRepository } from '../repositories/refresh-token.repository'
import { TEXT_HASHER, TextHasher } from '../../../infrastructure/security/hash/text-hasher.interface'
import { parse } from 'useragent'

@Injectable()
export class RefreshTokenServiceImpl implements RefreshTokenService {
  public constructor(
    @Inject(TEXT_HASHER) private readonly textHasher: TextHasher,
    private readonly config: ConfigService,
    private readonly refreshTokenRepository: RefreshTokenRepository
  ) {}

  public async create(user: User, userAgent: string, ipAddress: string): Promise<RefreshToken> {
    const refreshToken = new RefreshToken()
    refreshToken.user = user
    refreshToken.token = await this.textHasher.hash(
      randomBytes(this.config.getOrThrow('refreshToken.bytesLength')).toString('hex'),
    )
    refreshToken.userAgent = userAgent
    refreshToken.ipAddress = ipAddress
    refreshToken.expiresAt = new Date(Date.now() + this.config.getOrThrow<number>('refreshToken.expiresIn'))

    return this.refreshTokenRepository.save(refreshToken)
  }

  public async verify(refreshToken: string, userAgent: string): Promise<boolean> {
    const token = await this.refreshTokenRepository.findByToken(refreshToken)

    if (!token) return false
    if (token.expiresAt < new Date()) return false
    if (token.revoked) return false

    if (token.userAgent && userAgent) {
      const agent = parse(userAgent)
      const tokenAgent = parse(token.userAgent)

      if (
        tokenAgent.family !== agent.family ||
        tokenAgent.os.toString() !== agent.os.toString() ||
        tokenAgent.device.toString() !== agent.device.toString()
      ) {
        return false
      }
    }

    return true
  }
}
