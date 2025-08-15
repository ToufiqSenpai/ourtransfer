import { Injectable, Inject } from "@nestjs/common";
import { UserRepository } from "../repositories/user.repository";
import { User } from "../entities/user.entity";
import { InjectMapper } from "@automapper/nestjs";
import { Mapper } from "@automapper/core";
import { PASSWORD_HASHER, PasswordHasher } from "../../../infrastructure/security/hash/password-hasher.interface";
import { CreateUserDto } from "@ourtransfer/dto";
import { Readable } from "stream";

@Injectable()
export class UserService {
  public constructor(
    @InjectMapper() private readonly mapper: Mapper,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    private readonly userRepository: UserRepository
  ) {}

  public async createUser(dto: CreateUserDto): Promise<User> {
    const user = this.mapper.map(dto, CreateUserDto, User)

    if (dto.password) {
      user.password = await this.passwordHasher.hash(dto.password)
    }

    return await this.userRepository.save(user)
  }

  public async putUserAvatar(userId: string, avatar: Readable): Promise<void> {
    // const user = await this.userRepository.findOneById(userId)

    // if (!user) {
    //   throw new NotFoundException(`User with ID ${userId} not found`)
    // }

    // user.avatar = avatar
    // await this.userRepository.save(user)
  }
}
