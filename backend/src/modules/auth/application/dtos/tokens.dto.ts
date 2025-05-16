import { AutoMap } from '@automapper/classes'

export class TokensDto {
  @AutoMap()
  public accessToken: string

  @AutoMap()
  public refreshToken: string
}
