import { CommandHandler, ICommandHandler } from "@nestjs/cqrs"
import { Inject } from "@nestjs/common"
import { SignupCommand } from "../signup.command"
import { CommonResponseDto, SignupDto } from "@ourtransfer/dto"
import { Mapper } from "@automapper/core"
import { InjectMapper } from "@automapper/nestjs"
import { plainToInstance } from "class-transformer"
import { PASSWORD_HASHER, PasswordHasher } from "../../../../common/interfaces/security/hash/password-hasher.interface"
import { UserRepository } from "../../../user/repositories/user.repository"
import { User } from "../../../user/entities/user.entity"
import { PasswordIdentityRepository } from "../../repositories/password-identity.repository"
import { PasswordIdentity } from "../../entities/password-identity.entity"

@CommandHandler(SignupCommand)
export class SignupHandler implements ICommandHandler<SignupCommand> {
  public constructor(
    @InjectMapper() private readonly mapper: Mapper,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    private readonly passwordIdentityRepository: PasswordIdentityRepository,
    private readonly userRepository: UserRepository,
  ) {}

  public async execute(command: SignupCommand): Promise<CommonResponseDto> {
    await this.userRepository.insert(this.mapper.map(command.dto, SignupDto, User))

    const passwordIdentity = new PasswordIdentity()
    passwordIdentity.email = command.dto.email
    passwordIdentity.passwordHash = await this.passwordHasher.hash(command.dto.password)

    await this.passwordIdentityRepository.insert(passwordIdentity)

    return plainToInstance(CommonResponseDto, {
      message: "The user has been created successfully.",
    })
  }
}
