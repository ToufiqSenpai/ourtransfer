import { AutomapperProfile, InjectMapper } from '@automapper/nestjs'
import { createMap, forMember, mapFrom, Mapper } from '@automapper/core'
import { PasswordAuth } from '../../domain/entities/password-auth.entity'
import { SignupDto } from '@ourtransfer/dto'

export class AuthMapper extends AutomapperProfile {
  public constructor(@InjectMapper() mapper: Mapper) {
    super(mapper)
  }

  public override get profile() {
    return (mapper: Mapper): void => {
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
    }
  }
}
