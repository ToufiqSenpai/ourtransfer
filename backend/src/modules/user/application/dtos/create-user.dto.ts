import { AutoMap } from '@automapper/classes'

export class CreateUserDto {
  @AutoMap()
  public name: string

  @AutoMap()
  public email: string
}
