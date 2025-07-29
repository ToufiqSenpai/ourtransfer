import { PasswordIdentityRepository } from '../../domain/repositories/password-identity.repository';
import { PasswordIdentity } from '../../domain/entities/password-identity.entity';
import { Repository } from "typeorm"
import { InjectRepository } from "@nestjs/typeorm"

export class PasswordIdentityRepositoryImpl implements PasswordIdentityRepository {
  public constructor(@InjectRepository(PasswordIdentity) private readonly repository: Repository<PasswordIdentity>) {}

  public async create(entity: PasswordIdentity): Promise<PasswordIdentity> {
    return await this.repository.save(entity)
  }

  public async findById(id: string): Promise<PasswordIdentity | null> {
    return await this.repository.findOneBy({ id })
  }

  public findAll(): Promise<PasswordIdentity[]> {
    return this.repository.find()
  }

  public update(id: string, entity: PasswordIdentity): Promise<PasswordIdentity> {
    throw new Error("Method not implemented.")
  }

  public delete(id: string): Promise<void> {
    throw new Error("Method not implemented.")
  }
}
