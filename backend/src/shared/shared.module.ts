import { Global, Module } from '@nestjs/common'
import { LoggingInterceptor } from './interceptors/logging.interceptor'
import { APP_INTERCEPTOR } from '@nestjs/core'

@Global()
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  // exports: [
  //   {
  //     provide: APP_INTERCEPTOR,
  //     useClass: LoggingInterceptor,
  //   },
  // ],
})
export class SharedModule {}
