import { AutomapperProfile, InjectMapper } from '@automapper/nestjs'
import { createMap, forMember, mapFrom, Mapper } from '@automapper/core'
import { PasswordAuth } from '../../domain/entities/password-auth.entity'
import { SignupDto } from '../dtos/signup.dto'
import { CreateUserDto } from '../../../../modules/user/application/dtos/create-user.dto'
import { CreatePasswordAuthDto } from '../dtos/create-password-auth.dto'

export class AuthProfile extends AutomapperProfile {
  public constructor(@InjectMapper() mapper: Mapper) {
    super(mapper)
  }

  public override get profile() {
    return (mapper: Mapper) => {
      // Signup Profile
      createMap(
        mapper,
        SignupDto,
        PasswordAuth,
        forMember(
          d => d.userEmail,
          mapFrom(s => s.email),
        ),
      )
      createMap(mapper, SignupDto, CreatePasswordAuthDto)
      createMap(mapper, SignupDto, CreateUserDto)
    }
  }
}
