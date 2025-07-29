import { InjectDataSource } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { User } from '../entities/user.entity'
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class UserRepository extends Repository<User> {
  public constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super(User, dataSource.manager)
  }

  public findByEmail(email: string): Promise<User | null> {
    const userRepository = this.dataSource.getRepository(User)
    return userRepository.findOneBy({ email })
  }

  public async existsByEmail(email: string): Promise<boolean> {
    const userRepository = this.dataSource.getRepository(User)
    const user = await userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email })
      .limit(1)
      .getCount()

    return user > 0
  }
}
