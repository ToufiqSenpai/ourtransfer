import { Global, Module } from "@nestjs/common"
import { LOGGER } from "./logger.interface"
import { WinstonLogger } from "./winston.logger"

@Global()
@Module({
  providers: [
    {
      provide: LOGGER,
      useClass: WinstonLogger,
    },
  ],
  exports: [LOGGER],
})
export class LoggerModule {}
