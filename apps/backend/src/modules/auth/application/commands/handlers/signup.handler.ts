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
import { USER_REPOSITORY, UserRepository } from '../../../../user/domain/repositories/user.repository';
import { User } from '../../../../user/domain/entities/user.entity';
import {
  PASSWORD_IDENTITY_REPOSITORY,
  PasswordIdentityRepository,
} from "../../../domain/repositories/password-identity.repository"
import { PasswordIdentity } from "../../../domain/entities/password-identity.entity"

@CommandHandler(SignupCommand)
export class SignupHandler implements ICommandHandler<SignupCommand> {
  public constructor(
    @InjectMapper() private readonly mapper: Mapper,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(PASSWORD_IDENTITY_REPOSITORY) private readonly passwordIdentityRepository: PasswordIdentityRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository
  ) {}

  public async execute(command: SignupCommand): Promise<CommonResponseDto> {
    await this.userRepository.create(this.mapper.map(command.dto, SignupDto, User))

    const passwordIdentity = new PasswordIdentity()
    passwordIdentity.email = command.dto.email
    passwordIdentity.passwordHash = await this.passwordHasher.hash(command.dto.password)

    await this.passwordIdentityRepository.create(passwordIdentity)

    return plainToInstance(CommonResponseDto, {
      message: 'The user has been created successfully.',
    })
  }
}
