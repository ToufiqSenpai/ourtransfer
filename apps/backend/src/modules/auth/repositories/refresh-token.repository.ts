import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { InjectDataSource } from '@nestjs/typeorm';

@Injectable()
export class RefreshTokenRepository extends Repository<RefreshToken> {
  public constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super(RefreshToken, dataSource.manager)
  }

  public async findByToken(token: string): Promise<RefreshToken | null> {
    return this.findOne({
      where: { token },
    })
  }
}
