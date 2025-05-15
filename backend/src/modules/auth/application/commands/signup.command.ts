import { Command } from '@nestjs/cqrs'
import { SignupDto } from '../dtos/signup.dto'
import { CommonResponseDto } from 'src/common/dtos/common-response.dto'

export class SignupCommand extends Command<CommonResponseDto> {
  public constructor(public readonly dto: SignupDto) {
    super()
  }
}
