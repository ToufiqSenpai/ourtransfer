import { RefreshToken } from '../../application/interfaces/refresh-token.interface'
import { Injectable } from '@nestjs/common'

export class RefreshTokenService implements RefreshToken {
  public async create(): Promise<string> {}

  // public async verify(token: string): Promise<string> {
  //   return this.refreshToken.verify(token);
  // }

  // public async delete(token: string): Promise<void> {
  //   return this.refreshToken.delete(token);
  // }
}
