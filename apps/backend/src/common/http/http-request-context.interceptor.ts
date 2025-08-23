import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { Request } from 'express'
import { ExpressHttpRequest } from "./express-http-request";
import { HttpRequestContext } from "./http-request.context";

@Injectable()
export class HttpRequestContextInterceptor implements NestInterceptor {
  public constructor(private readonly httpRequestContext: HttpRequestContext) {}

  public intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>()
    const requestContext = new ExpressHttpRequest(request)

    return new Observable(subscriber => {
      this.httpRequestContext.run(requestContext, async () => {
        const subscription = next.handle().subscribe({
          next: (value) => { subscriber.next(value); },
          error: (error) => { subscriber.error(error); },
          complete: () => { subscriber.complete(); },
        })

        return subscription
      })
    })
  }
}
