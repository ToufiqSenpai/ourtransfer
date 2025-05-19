import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { Inject } from '@nestjs/common'
import { SignupCommand } from '../signup.command'
import { CommonResponseDto } from '../../../../../common/dtos/common-response.dto'
import { CreateUserCommand } from '../../../../../modules/user/application/commands/create-user.command'
import { Mapper } from '@automapper/core'
import { InjectMapper } from '@automapper/nestjs'
import { CreateUserDto } from '../../../../../modules/user/application/dtos/create-user.dto'
import { plainToInstance } from 'class-transformer'
import { SignupDto } from '../../dtos/signup.dto'
import { PASSWORD_HASHER, PasswordHasher } from '../../../../../common/interfaces/hash/password-hasher.interface'
import { PASSWORD_AUTH_REPOSITORY, PasswordAuthRepository } from '../../../domain/repositories/password-auth.repository'
import { PasswordAuth } from '../../../domain/entities/password-auth.entity'

@CommandHandler(SignupCommand)
export class SignupHandler implements ICommandHandler<SignupCommand> {
  public constructor(
    private readonly commandBus: CommandBus,
    @InjectMapper() private readonly mapper: Mapper,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(PASSWORD_AUTH_REPOSITORY) private readonly passwordAuthRepository: PasswordAuthRepository,
  ) {}

  public async execute(command: SignupCommand): Promise<CommonResponseDto> {
    await this.commandBus.execute(new CreateUserCommand(this.mapper.map(command.dto, SignupDto, CreateUserDto)))

    const passwordAuth = this.mapper.map(command.dto, SignupDto, PasswordAuth)
    passwordAuth.password = await this.passwordHasher.hash(passwordAuth.password)

    await this.passwordAuthRepository.create(passwordAuth)

    return plainToInstance(CommonResponseDto, {
      message: 'User created successfully.',
    })
  }
}
