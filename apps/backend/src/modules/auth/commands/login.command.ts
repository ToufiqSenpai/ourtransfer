import { Command } from '@nestjs/cqrs'
import { TokensDto, LoginDto } from '@ourtransfer/dto';

export class LoginCommand extends Command<TokensDto> {
  public constructor(
    public readonly dto: LoginDto,
    public readonly userAgent: string,
    public readonly ipAddress: string,
  ) {
    super()
  }
}
