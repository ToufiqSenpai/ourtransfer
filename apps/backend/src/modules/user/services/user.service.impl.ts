import { Injectable, Inject } from "@nestjs/common";
import { UserService } from "./user.service";
import { USER_REPOSITORY, UserRepository } from "../repositories/user.repository";
import { User } from "../entities/user.entity";
import { IDENTITY_SERVICE, IdentityService } from "../../auth/services/identity.service";
import { Readable } from "stream";

@Injectable()
export class UserServiceImpl implements UserService {
  public constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(IDENTITY_SERVICE) private readonly identityService: IdentityService,
  ) {}

  public async createUser(name: string, email: string): Promise<User> {
    const user = new User()
    user.name = name
    user.email = email

    const savedUser = await this.userRepository.save(user)

    await this.identityService.createEmailIdentity(savedUser)

    return savedUser
  }

  public putUserAvatar(userId: string, avatar: Readable): Promise<void> {

  }
}
