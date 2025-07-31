import { Global, Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ConfigService } from "@nestjs/config"
import { SecretManager } from "../secret/secret-manager.abstract"
import { NodeEnv } from "@ourtransfer/common"
import { TypeOrmLogger } from "./typeorm.logger"
import { User } from '../../modules/user/entities/user.entity';
import { Identity } from '../../modules/auth/entities/identity.entity';
import { PasswordIdentity } from '../../modules/auth/entities/password-identity.entity';
import { OauthIdentity } from '../../modules/auth/entities/oauth-identity.entity';
import { RefreshToken } from '../../modules/auth/entities/refresh-token.entity';
import { TRANSACTION_CONTEXT_SERVICE } from "./unit-of-work/transaction-context.service"
import { TransactionContextServiceImpl } from "./unit-of-work/transaction-context.service.impl"
import { UNIT_OF_WORK } from "./unit-of-work/unit-of-work.interface"
import { UnitOfWorkImpl } from "./unit-of-work/unit-of-work.impl"
import { ProviderUtil } from "../utils/provider.util"

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      async useFactory(config: ConfigService, secret: SecretManager, typeOrmLogger: TypeOrmLogger) {
        return {
          type: config.get<"postgres">("database.type"),
          host: await secret.getOrThrow("DATABASE_HOST"),
          port: parseInt(await secret.getOrThrow("DATABASE_PORT")),
          username: await secret.getOrThrow("DATABASE_USERNAME"),
          password: await secret.getOrThrow("DATABASE_PASSWORD"),
          database: await secret.getOrThrow("DATABASE_NAME"),
          entities: [User, Identity, PasswordIdentity, OauthIdentity, RefreshToken],
          synchronize: config.get("app.nodeEnv") !== NodeEnv.PRODUCTION,
          ssl: config.get<boolean>("database.ssl"),
          dropSchema: true, // Only for development purposes
          logging: config.get("app.nodeEnv") !== NodeEnv.TEST,
          logger: typeOrmLogger,
        }
      },
      inject: [ConfigService, SecretManager, TypeOrmLogger],
    }),
  ],
  providers: [
    TypeOrmLogger,
    ProviderUtil,
    {
      provide: TRANSACTION_CONTEXT_SERVICE,
      useClass: TransactionContextServiceImpl,
    },
    {
      provide: UNIT_OF_WORK,
      useClass: UnitOfWorkImpl
    }
  ],
  exports: [TypeOrmLogger, UNIT_OF_WORK, TRANSACTION_CONTEXT_SERVICE, ProviderUtil],
})
export class DatabaseModule {}
