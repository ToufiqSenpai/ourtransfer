import { AutomapperProfile, InjectMapper } from '@automapper/nestjs'
import { createMap, Mapper } from '@automapper/core'
import { CreatePasswordAuthCommand } from '../commands/create-password-auth.command'
import { PasswordAuth } from '../../domain/entities/password-auth.entity'
import { SignupDto } from '../dtos/signup.dto'
import { CreateUserDto } from 'src/modules/user/application/dtos/create-user.dto'

export class AuthProfile extends AutomapperProfile {
  public constructor(@InjectMapper() mapper: Mapper) {
    super(mapper)
  }

  public override get profile() {
    return (mapper: Mapper) => {
      createMap(mapper, CreatePasswordAuthCommand, PasswordAuth)
      createMap(mapper, SignupDto, CreateUserDto)
    }
  }
}
