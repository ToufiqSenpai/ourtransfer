import { RequestMethod } from "@nestjs/common"
import { randomUUID } from 'crypto'
import { Readable } from 'stream';

export abstract class HttpRequest<B = any> {
  private readonly _correlationId: string = randomUUID()
  private readonly _requestId: string = randomUUID()

  public abstract get body(): B
  public abstract get headers(): Map<string, string>
  public abstract get ip(): string
  public abstract get method(): RequestMethod
  public abstract get path(): string
  public abstract get query(): Map<string, string>
  public abstract get stream(): Readable
  public abstract get userId(): string

  public get correlationId(): string { return this._correlationId }
  public get requestId(): string { return this._requestId }
}
