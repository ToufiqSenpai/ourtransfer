import { afterMap, createMap, Mapper } from '@automapper/core'
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs'
import { User } from '../../domain/entities/user.entity'
import { UserDto } from '@ourtransfer/dto'
import { Inject } from '@nestjs/common'
import { FILE_STORAGE, FileOperation, FileStorage } from '../../../../common/interfaces/storage/file-storage.interface'

export class UserProfile extends AutomapperProfile {
  public constructor(
    @InjectMapper() mapper: Mapper,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStorage,
  ) {
    super(mapper)
  }

  public override get profile() {
    return (mapper: Mapper): void => {
      // createMap(mapper, CreateUserDto, User)
      createMap(
        mapper,
        User,
        UserDto,
        afterMap(async (source, destination) => {
          const presignedUrl = await this.fileStorage.getPresignedUrl(
            `users/avatar/${source.id}`,
            1000 * 60 * 60 * 24 * 7,
            FileOperation.READ,
          )

          Object.assign(destination, { avatarUrl: presignedUrl })
        }),
      )
    }
  }
}
