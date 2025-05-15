import { User } from '../../domain/entities/user.entity'
import { UserRepository } from '../../domain/repositories/user.repository'
import { DataSource } from 'typeorm'

export class UserRepositoryImpl implements UserRepository {
  public constructor(private readonly dataSource: DataSource) {}

  public async create(item: User): Promise<User> {
    const userRepository = this.dataSource.getRepository(User)
    const { identifiers } = await userRepository.insert(item)
    const user = await userRepository.findOneBy({ id: identifiers[0].id as string })

    return user as User
  }

  public findById(id: string): Promise<User | null> {
    const userRepository = this.dataSource.getRepository(User)
    return userRepository.findOneBy({ id })
  }

  public findByEmail(email: string): Promise<User | null> {
    const userRepository = this.dataSource.getRepository(User)
    return userRepository.findOneBy({ email })
  }

  public findAll(): Promise<User[]> {
    throw new Error('Method not implemented.')
  }

  public update(id: string, item: User): Promise<User> {
    throw new Error('Method not implemented.')
  }

  public delete(id: string): Promise<void> {
    throw new Error('Method not implemented.')
  }

  public async isEmailUnique(email: string): Promise<boolean> {
    const userRepository = this.dataSource.getRepository(User)
    const user = await userRepository.countBy({ email })
    return user === 0
  }
}
