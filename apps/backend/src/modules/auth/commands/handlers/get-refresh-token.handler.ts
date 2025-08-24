import { Inject, UnauthorizedException } from "@nestjs/common"
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs"
import { GetRefreshTokenCommand } from "../get-refresh-token.command"
import { RefreshTokenService } from "../../services/refresh-token.service"
import { ACCESS_TOKEN_JWT } from '../../../../infrastructure/security/jwt/access-token-jwt.interface';
import { Jwt } from '../../../../infrastructure/security/jwt/jwt.interface';
import { TokensDto } from '@ourtransfer/dto';
import { RefreshTokenRepository } from '../../repositories/refresh-token.repository';

@CommandHandler(GetRefreshTokenCommand)
export class GetRefreshTokenHandler implements ICommandHandler<GetRefreshTokenCommand> {
  public constructor(
    @Inject(ACCESS_TOKEN_JWT) private readonly accessToken: Jwt,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly refreshTokenRepository: RefreshTokenRepository
  ) {}

  public async execute(command: GetRefreshTokenCommand): Promise<TokensDto> {
    const isRefreshTokenValid = await this.refreshTokenService.verify(command.refreshToken, command.userAgent)

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException({
        message: 'Invalid refresh token.',
      })
    }

    const oldRefreshToken = await this.refreshTokenRepository.findByToken(command.refreshToken)

    if (!oldRefreshToken) {
      throw new UnauthorizedException({
        message: 'Invalid refresh token.',
      })
    }

    const refreshToken = await this.refreshTokenService.create(
      oldRefreshToken.user,
      command.userAgent,
      command.ipAddress,
    )
    const accessToken = await this.accessToken.sign(oldRefreshToken.user.id)
    const tokens = new TokensDto()
    tokens.accessToken = accessToken
    tokens.refreshToken = refreshToken.token

    return tokens
  }
}
