import { Command } from '@nestjs/cqrs'
import { TokensDto } from '../dtos/tokens.dto'
import { LoginDto } from '../dtos/login.dto'

export class LoginCommand extends Command<TokensDto> {
  public constructor(public readonly dto: LoginDto) {
    super()
  }
}
