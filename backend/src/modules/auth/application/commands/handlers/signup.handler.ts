import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { SignupCommand } from '../signup.command'
import { CommonResponseDto } from '../../../../../common/dtos/common-response.dto'
import { CreateUserCommand } from '../../../../../modules/user/application/commands/create-user.command'
import { Mapper } from '@automapper/core'
import { InjectMapper } from '@automapper/nestjs'
import { CreateUserDto } from '../../../../../modules/user/application/dtos/create-user.dto'
import { CreatePasswordAuthCommand } from '../create-password-auth.command'
import { plainToInstance } from 'class-transformer'
import { SignupDto } from '../../dtos/signup.dto'
import { CreatePasswordAuthDto } from '../../dtos/create-password-auth.dto'

@CommandHandler(SignupCommand)
export class SignupHandler implements ICommandHandler<SignupCommand> {
  public constructor(
    private readonly commandBus: CommandBus,
    @InjectMapper() private readonly mapper: Mapper,
  ) {}

  public async execute(command: SignupCommand): Promise<CommonResponseDto> {
    await this.commandBus.execute(new CreateUserCommand(this.mapper.map(command.dto, SignupDto, CreateUserDto)))
    await this.commandBus.execute(
      new CreatePasswordAuthCommand(this.mapper.map(command.dto, SignupDto, CreatePasswordAuthDto)),
    )

    return plainToInstance(CommonResponseDto, {
      message: 'User created successfully.',
    })
  }
}
