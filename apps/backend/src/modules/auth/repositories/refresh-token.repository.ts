import { RefreshToken } from '../entities/refresh-token.entity';
import { BaseRepository } from "../../../infrastructure/database/base.repository"

export const REFRESH_TOKEN_REPOSITORY = Symbol('RefreshTokenRepository')

export interface RefreshTokenRepository extends BaseRepository<RefreshToken, string> {
  findByToken(token: string): Promise<RefreshToken | null>;
}
