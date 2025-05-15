import { ICommandHandler, CommandHandler } from '@nestjs/cqrs'
import { CreatePasswordAuthCommand } from '../create-password-auth.command'
import { Inject } from '@nestjs/common'
import { PASSWORD_HASHER, PasswordHasher } from 'src/common/interfaces/password-hasher.interface'
import {
  PASSWORD_AUTH_REPOSITORY,
  PasswordAuthRepository,
} from 'src/modules/auth/domain/repositories/password-auth.repository'
import { InjectMapper } from '@automapper/nestjs'
import { Mapper } from '@automapper/core'
import { PasswordAuth } from 'src/modules/auth/domain/entities/password-auth.entity'

@CommandHandler(CreatePasswordAuthCommand)
export class CreatePasswordAuthHandler implements ICommandHandler<CreatePasswordAuthCommand> {
  public constructor(
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(PASSWORD_AUTH_REPOSITORY) private readonly passwordAuthRepository: PasswordAuthRepository,
    @InjectMapper() private readonly mapper: Mapper,
  ) {}

  public async execute(command: CreatePasswordAuthCommand): Promise<void> {
    const passwordAuth = this.mapper.map(command, CreatePasswordAuthCommand, PasswordAuth)
    passwordAuth.password = await this.passwordHasher.hash(command.password)

    await this.passwordAuthRepository.create(passwordAuth)
  }
}
