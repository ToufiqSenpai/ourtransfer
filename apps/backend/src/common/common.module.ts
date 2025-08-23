import { Global, Module } from '@nestjs/common';
import { HttpRequestContext } from './http/http-request.context';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpRequestContextInterceptor } from './http/http-request-context.interceptor';

@Global()
@Module({
  providers: [
    HttpRequestContext,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpRequestContextInterceptor,
    }
  ],
  exports: [HttpRequestContext],
})
export class CommonModule {}
