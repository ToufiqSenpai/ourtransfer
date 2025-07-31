export const TRANSACTION_CONTEXT_SERVICE = Symbol('TransactionContextService')

export interface TransactionContextService<T> {
  getContext(): T | undefined
  run<U>(context: T, callback: () => Promise<U>): Promise<U>
}
