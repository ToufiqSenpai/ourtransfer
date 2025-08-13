import { ICommandHandler, CommandHandler } from "@nestjs/cqrs";
import { SendLoginVerificationCodeCommand } from "../send-login-verification-code.command";
import { CommonResponseDto } from "@ourtransfer/dto";
import { LoginVerificationCodeService } from "../../services/login-verification-code.service";
import { UserRepository } from "../../../user/repositories/user.repository";
import { NotFoundException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";

@CommandHandler(SendLoginVerificationCodeCommand)
export class SendLoginVerificationCodeHandler implements ICommandHandler<SendLoginVerificationCodeCommand> {
  public constructor(
    private readonly loginVerificationCodeService: LoginVerificationCodeService,
    private readonly userRepository: UserRepository
  ) {}

  public async execute(command: SendLoginVerificationCodeCommand): Promise<CommonResponseDto> {
    const user = await this.userRepository.findByEmail(command.dto.email)

    if (!user) {
      throw new NotFoundException(plainToInstance(CommonResponseDto, {
        message: "User not found."
      }))
    }

    await this.loginVerificationCodeService.sendVerificationCode(user)

    return plainToInstance(CommonResponseDto, {
      message: "A verification code has send to the email. Please check your inbox."
    })
  }
}
