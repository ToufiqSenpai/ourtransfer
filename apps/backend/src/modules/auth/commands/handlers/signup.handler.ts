import { CommandHandler, ICommandHandler } from "@nestjs/cqrs"
import { Inject } from "@nestjs/common"
import { SignupCommand } from "../signup.command"
import { CommonResponseDto, SignupDto } from "@ourtransfer/dto"
import { Mapper } from "@automapper/core"
import { InjectMapper } from "@automapper/nestjs"
import { plainToInstance } from "class-transformer"
import { PASSWORD_HASHER, PasswordHasher } from "../../../../infrastructure/security/hash/password-hasher.interface"
import { USER_REPOSITORY, UserRepository } from "../../../user/repositories/user.repository"
import { User } from "../../../user/entities/user.entity"
import { PASSWORD_IDENTITY_REPOSITORY, PasswordIdentityRepository } from "../../repositories/password-identity.repository"
import { PasswordIdentity } from "../../entities/password-identity.entity"
import { AuthProvider } from "@ourtransfer/common"
import { UNIT_OF_WORK, UnitOfWork } from "../../../../infrastructure/database/unit-of-work/unit-of-work.interface"
import { IDENTITY_SERVICE, IdentityService } from '../../services/identity.service';

@CommandHandler(SignupCommand)
export class SignupHandler implements ICommandHandler<SignupCommand> {
  public constructor(
    @InjectMapper() private readonly mapper: Mapper,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(IDENTITY_SERVICE) private readonly identityService: IdentityService,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_IDENTITY_REPOSITORY) private readonly passwordIdentityRepository: PasswordIdentityRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork
  ) {}

  public async execute(command: SignupCommand): Promise<CommonResponseDto> {
    await this.identityService.throwIfIdentityExists(command.dto.email)

    await this.unitOfWork.transaction(async () => {
      const user = await this.userRepository.save(this.mapper.map(command.dto, SignupDto, User))

      const passwordIdentity = new PasswordIdentity()
      passwordIdentity.user = user
      passwordIdentity.authProvider = AuthProvider.EMAIL_PASSWORD
      passwordIdentity.passwordHash = await this.passwordHasher.hash(command.dto.password)

      await this.passwordIdentityRepository.insert(passwordIdentity)
    })

    return plainToInstance(CommonResponseDto, {
      message: "The user has been created successfully.",
    })
  }
}
