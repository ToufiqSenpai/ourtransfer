import { Global, Module } from '@nestjs/common';
import { LOGGER } from '../../common/interfaces/logger/logger.interface';
import { WinstonLogger } from './winston.logger';

@Global()
@Module({
  providers: [
    {
      provide: LOGGER,
      useClass: WinstonLogger
    }
  ],
  exports: [LOGGER]
})
export class LoggerModule {}
