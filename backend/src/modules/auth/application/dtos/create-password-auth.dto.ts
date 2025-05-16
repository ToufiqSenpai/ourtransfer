import { AutoMap } from '@automapper/classes'

export class CreatePasswordAuthDto {
  @AutoMap()
  public email: string

  @AutoMap()
  public password: string
}
