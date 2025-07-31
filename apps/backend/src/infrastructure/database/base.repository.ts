import { BaseEntity } from '../../common/base/base.entity';

export interface BaseRepository<E extends BaseEntity, ID> {
  insert(entity: E): Promise<void>
  insertMany(entities: E[]): Promise<void>

  findById(id: ID): Promise<E | null>
  findAll(): Promise<E[]>

  save(entity: E): Promise<E>

  update(id: ID, entity: E): Promise<void>

  delete(id: ID): Promise<void>
  deleteAll(): Promise<void>

  count(): Promise<number>
  existsById(id: ID): Promise<boolean>
}
