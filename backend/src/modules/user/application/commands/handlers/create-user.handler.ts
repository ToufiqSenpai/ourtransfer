import { Inject } from '@nestjs/common'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { CreateUserCommand } from '../create-user.command'
import { UserRepository, USER_REPOSITORY } from '../../../domain/repositories/user.repository'
import { InjectMapper } from '@automapper/nestjs'
import { Mapper } from '@automapper/core'
import { CreateUserDto } from '../../dtos/create-user.dto'
import { User } from '../../../domain/entities/user.entity'

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  public constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @InjectMapper() private readonly mapper: Mapper,
  ) {}

  public async execute(command: CreateUserCommand): Promise<void> {
    const user = this.mapper.map(command.dto, CreateUserDto, User)

    await this.userRepository.create(user)
  }
}
