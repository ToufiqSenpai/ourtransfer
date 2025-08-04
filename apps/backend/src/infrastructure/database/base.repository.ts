import { DataSource, EntityManager, Repository } from "typeorm"
import { BaseEntity } from '../../common/base/base.entity';
import { TransactionContextService } from './unit-of-work/transaction-context.service';

export abstract class BaseRepository <E extends BaseEntity, ID> {
  protected constructor(
    protected readonly dataSource: DataSource,
    protected readonly transactionContextService: TransactionContextService<EntityManager>,
    protected entity: new () => E
  ) {}

  protected getRepository(): Repository<E> {
    const repositoryContext = this.transactionContextService.getContext()
    return repositoryContext ? repositoryContext.getRepository<E>(this.entity) : this.dataSource.getRepository<E>(this.entity)
  }

  public count(): Promise<number> {
    return this.getRepository().count()
  }

  public async delete(id: ID): Promise<void> {
    await this.getRepository().delete(id as any)
  }

  public async deleteAll(): Promise<void> {
    await this.getRepository().clear()
  }

  public existsById(id: ID): Promise<boolean> {
    return this.getRepository().exists({ where: { id: id as any } })
  }

  public findAll(): Promise<E[]> {
    return this.getRepository().find()
  }

  public findById(id: ID): Promise<E | null> {
    return this.getRepository().findOne({ where: { id: id as any } })
  }

  public async insert(entity: E): Promise<void> {
    await this.getRepository().insert(entity as any)
  }

  public async insertMany(entities: E[]): Promise<void> {
    await this.getRepository().insert(entities as any[])
  }

  public save(entity: E): Promise<E> {
    return this.getRepository().save(entity)
  }

  public async update(id: ID, entity: E): Promise<void> {
    await this.getRepository().update(id as any, entity as any)
  }
}
