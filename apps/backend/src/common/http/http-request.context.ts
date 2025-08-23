import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { HttpRequest } from './http-request';

@Injectable()
export class HttpRequestContext {
  private readonly storage = new AsyncLocalStorage<HttpRequest>()

  public get(): HttpRequest | undefined {
    return this.storage.getStore()
  }

  public async run<U>(context: HttpRequest, callback: () => Promise<U>): Promise<U> {
    return this.storage.run(context, callback)
  }
}
