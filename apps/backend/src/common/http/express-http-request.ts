import { HttpRequest } from './http-request';
import { RequestMethod } from '@nestjs/common';
import { Readable } from 'stream';
import { Request } from 'express';

export class ExpressHttpRequest<B> extends HttpRequest<B> {
  public constructor(private readonly request: Request) {
    super();
  }

  public get body(): any {
    return this.request.body;
  }

  public get headers(): Map<string, string> {
    return new Map<string, string>(
      Object.entries(this.request.headers)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value] as [string, string])
    )
  }

  public get ip(): string {
    return this.request.headers['x-forwarded-for'] as string || this.request.socket.remoteAddress || '';
  }

  public get method(): RequestMethod {
    return RequestMethod[this.request.method.toUpperCase() as keyof typeof RequestMethod]
  }

  public get path(): string {
    return this.request.path
  }

  public get query(): Map<string, string> {
    return new Map<string, string>(
      Object.entries(this.request.query)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, Array.isArray(value) ? value[0] : typeof value === 'string' ? value : JSON.stringify(value)] as [string, string])
    )
  }

  public get stream(): Readable {
    return this.request;
  }

  public get userId(): string {
    return this.request.userId
  }
}
