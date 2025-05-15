import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { SignupCommand } from '../signup.command'
import { CommonResponseDto } from 'src/common/dtos/common-response.dto'
import { CreateUserCommand } from 'src/modules/user/application/commands/create-user.command'
import { Mapper } from '@automapper/core'
import { InjectMapper } from '@automapper/nestjs'
import { CreateUserDto } from 'src/modules/user/application/dtos/create-user.dto'
import { CreatePasswordAuthCommand } from '../create-password-auth.command'
import { plainToInstance } from 'class-transformer'

@CommandHandler(SignupCommand)
export class SignupHandler implements ICommandHandler<SignupCommand> {
  public constructor(
    private readonly commandBus: CommandBus,
    @InjectMapper() private readonly mapper: Mapper,
  ) {}

  public async execute(command: SignupCommand): Promise<CommonResponseDto> {
    await this.commandBus.execute(new CreateUserCommand(this.mapper.map(command.dto, CreateUserDto)))
    await this.commandBus.execute(new CreatePasswordAuthCommand(command.dto.email, command.dto.password))

    return plainToInstance(CommonResponseDto, {
      message: 'User created successfully',
    }) as CommonResponseDto
  }
}
