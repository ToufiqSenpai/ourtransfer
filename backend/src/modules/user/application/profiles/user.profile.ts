import { createMap, Mapper } from '@automapper/core'
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs'
import { User } from '../../domain/entities/user.entity'
import { CreateUserDto } from '../dtos/create-user.dto'

export class UserProfile extends AutomapperProfile {
  public constructor(@InjectMapper() mapper: Mapper) {
    super(mapper)
  }

  public override get profile() {
    return (mapper: Mapper) => {
      createMap(mapper, CreateUserDto, User)
    }
  }
}
