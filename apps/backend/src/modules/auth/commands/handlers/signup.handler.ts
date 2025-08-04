import { CommandHandler, ICommandHandler } from "@nestjs/cqrs"
import { SignupCommand } from "../signup.command"
import { CommonResponseDto, CreateUserDto, SignupDto } from "@ourtransfer/dto"
import { Mapper } from "@automapper/core"
import { InjectMapper } from "@automapper/nestjs"
import { plainToInstance } from "class-transformer"
import { UserService } from "../../../user/services/user.service"

@CommandHandler(SignupCommand)
export class SignupHandler implements ICommandHandler<SignupCommand> {
  public constructor(
    @InjectMapper() private readonly mapper: Mapper,
    private readonly userService: UserService,
  ) {}

  public async execute(command: SignupCommand): Promise<CommonResponseDto> {
    const createUserDto = this.mapper.map(command.dto, SignupDto, CreateUserDto)

    await this.userService.createUser(createUserDto)

    return plainToInstance(CommonResponseDto, {
      message: "The user has been created successfully.",
    })
  }
}
