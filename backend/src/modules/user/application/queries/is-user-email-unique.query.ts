import { Query } from '@nestjs/cqrs'

export class IsUserEmailUniqueQuery extends Query<boolean> {
  public constructor(public readonly email: string) {
    super()
  }
}
