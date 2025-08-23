import { Global, Module } from "@nestjs/common"
import { Logger } from "./logger.abstract"
import { WinstonLogger } from "./winston.logger"
import { Client } from '@elastic/elasticsearch';
import { SecretManager } from '../secret/secret-manager.abstract';
import { BullModule } from "@nestjs/bullmq";
import { LOG_QUEUE, LogConsumer } from "./log.consumer";
import { HttpRequestLoggingInterceptor } from "./http-request-logging.interceptor";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { TypeOrmLogger } from "./logger/typeorm.logger";

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: LOG_QUEUE,
    })
  ],
  providers: [
    {
      provide: Logger,
      useClass: WinstonLogger,
    },
    {
      provide: Client,
      async useFactory(secret: SecretManager): Promise<Client> {
        return new Client({
          node: await secret.getOrThrow("ELASTICSEARCH_URL"),
        })
      },
      inject: [SecretManager],
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpRequestLoggingInterceptor,
    },
    LogConsumer,
    TypeOrmLogger,
  ],
  exports: [Logger, TypeOrmLogger],
})
export class LogModule {}
