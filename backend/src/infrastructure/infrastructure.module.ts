import { Global, Module } from '@nestjs/common'
import { LOGGER } from '../common/interfaces/logger.interface'
import { WinstonLogger } from './logger/winston.logger'
import { SECRET_MANAGER } from '../common/interfaces/secret-manager.interface'
import { EnvSecretManager } from './secrets/env.secret-manager'

@Global()
@Module({
  providers: [
    {
      provide: LOGGER,
      useClass: WinstonLogger,
    },
    {
      provide: SECRET_MANAGER,
      useClass: EnvSecretManager,
    },
  ],
  exports: [
    {
      provide: LOGGER,
      useClass: WinstonLogger,
    },
    {
      provide: SECRET_MANAGER,
      useClass: EnvSecretManager,
    },
  ],
})
export class InfrastructureModule {}
