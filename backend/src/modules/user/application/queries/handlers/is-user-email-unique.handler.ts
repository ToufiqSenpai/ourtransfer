import { QueryHandler, IQueryHandler } from '@nestjs/cqrs'
import { Inject } from '@nestjs/common'
import { IsUserEmailUniqueQuery } from '../is-user-email-unique.query'
import { USER_REPOSITORY, UserRepository } from 'src/modules/user/domain/repositories/user.repository'

@QueryHandler(IsUserEmailUniqueQuery)
export class IsUserEmailUniqueHandler implements IQueryHandler<IsUserEmailUniqueQuery, boolean> {
  public constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  public async execute(query: IsUserEmailUniqueQuery): Promise<boolean> {
    const { email } = query

    return this.userRepository.isEmailUnique(email)
  }
}
