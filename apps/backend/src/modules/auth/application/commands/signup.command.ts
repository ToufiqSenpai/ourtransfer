import { Command } from '@nestjs/cqrs'
import { SignupDto, CommonResponseDto } from '@ourtransfer/dto'

export class SignupCommand extends Command<CommonResponseDto> {
  public constructor(public readonly dto: SignupDto) {
    super()
  }
}
