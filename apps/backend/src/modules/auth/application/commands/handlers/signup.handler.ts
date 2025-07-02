import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { Inject } from '@nestjs/common'
import { SignupCommand } from '../signup.command'
import { CommonResponseDto, SignupDto } from '@ourtransfer/dto'
import { Mapper } from '@automapper/core'
import { InjectMapper } from '@automapper/nestjs'
import { plainToInstance } from 'class-transformer'
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from '../../../../../common/interfaces/security/hash/password-hasher.interface'
import { PASSWORD_AUTH_REPOSITORY, PasswordAuthRepository } from '../../../domain/repositories/password-auth.repository'
import { PasswordAuth } from '../../../domain/entities/password-auth.entity'
import { USER_REPOSITORY, UserRepository } from '../../../../user/domain/repositories/user.repository';
import { User } from '../../../../user/domain/entities/user.entity';

@CommandHandler(SignupCommand)
export class SignupHandler implements ICommandHandler<SignupCommand> {
  public constructor(
    @InjectMapper() private readonly mapper: Mapper,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(PASSWORD_AUTH_REPOSITORY) private readonly passwordAuthRepository: PasswordAuthRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository
  ) {}

  public async execute(command: SignupCommand): Promise<CommonResponseDto> {
    await this.userRepository.create(this.mapper.map(command.dto, SignupDto, User))

    const passwordAuth = this.mapper.map(command.dto, SignupDto, PasswordAuth)
    passwordAuth.password = await this.passwordHasher.hash(passwordAuth.password)

    await this.passwordAuthRepository.create(passwordAuth)

    return plainToInstance(CommonResponseDto, {
      message: 'User created successfully.',
    })
  }
}
