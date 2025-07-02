export interface BaseRepository<T, ID> {
  create(entity: T): Promise<T>
  findById(id: ID): Promise<T | null>
  findAll(): Promise<T[]>
  update(id: ID, entity: T): Promise<T>
  delete(id: ID): Promise<void>
}
