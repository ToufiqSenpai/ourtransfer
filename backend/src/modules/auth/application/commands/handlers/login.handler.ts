import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { Inject, UnauthorizedException } from '@nestjs/common'
import { LoginCommand } from '../login.command'
import { TokensDto } from '../../dtos/tokens.dto'
import { PASSWORD_AUTH_REPOSITORY, PasswordAuthRepository } from '../../../domain/repositories/password-auth.repository'
import { PASSWORD_HASHER, PasswordHasher } from '../../../../../common/interfaces/password-hasher.interface'
import { plainToInstance } from 'class-transformer'
import { CommonResponseDto } from '../../../../../common/dtos/common-response.dto'

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  public constructor(
    @Inject(PASSWORD_AUTH_REPOSITORY) private readonly passwordAuthRepository: PasswordAuthRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
  ) {}

  public async execute(command: LoginCommand): Promise<TokensDto> {
    const passwordAuth = await this.passwordAuthRepository.findByEmail(command.dto.email)

    if (!passwordAuth || !(await this.passwordHasher.compare(command.dto.password, passwordAuth?.password || ''))) {
      throw new UnauthorizedException(
        plainToInstance(CommonResponseDto, {
          message: 'Email or password is incorrect.',
        }),
      )
    }

    return Promise.resolve(new TokensDto())
  }
}
