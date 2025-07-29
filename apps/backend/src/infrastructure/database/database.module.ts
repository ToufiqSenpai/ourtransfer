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
          logging: config.get("app.nodeEnv") !== NodeEnv.TEST,
          logger: typeOrmLogger,
        }
      },
      inject: [ConfigService, SecretManager, TypeOrmLogger],
    }),
  ],
  providers: [TypeOrmLogger],
  exports: [TypeOrmLogger],
})
export class DatabaseModule {}
