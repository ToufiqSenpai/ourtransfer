export interface BaseRepository<T, ID> {
  create(entity: T): Promise<T>
  createMany?(entity: T[]): Promise<T[]>

  findById(id: ID): Promise<T | null>
  findAll(): Promise<T[]>

  update(id: ID, entity: T): Promise<T>

  existsById?(id: ID): Promise<boolean>
  count?(): Promise<number>

  delete(id: ID): Promise<void>
}
