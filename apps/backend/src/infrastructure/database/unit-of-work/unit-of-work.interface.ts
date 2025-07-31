export const UNIT_OF_WORK = Symbol('UnitOfWork')

export interface UnitOfWork {
  transaction<T>(callback: () => Promise<T>): Promise<T>
}
