import { Command } from "@nestjs/cqrs";
import { SendLoginVerificationCodeDto, CommonResponseDto } from "@ourtransfer/dto";

export class SendLoginVerificationCodeCommand extends Command<CommonResponseDto> {
  public constructor(public readonly dto: SendLoginVerificationCodeDto) {
    super()
  }
}
