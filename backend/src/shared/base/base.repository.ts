export interface BaseRepository<T, ID> {
  create(item: T): Promise<T>
  findById(id: ID): Promise<T | null>
  findAll(): Promise<T[]>
  update(id: ID, item: T): Promise<T>
  delete(id: ID): Promise<void>
}
