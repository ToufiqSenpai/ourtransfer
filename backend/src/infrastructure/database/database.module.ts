import { Global, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigService } from '@nestjs/config'
import { SecretManager } from '../../common/abstracts/secret-manager.abstract'
import { NodeEnv } from '../../common/enums/node-env.enum'
import { TypeOrmLogger } from './typeorm.logger'

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      async useFactory(config: ConfigService, secret: SecretManager, typeOrmLogger: TypeOrmLogger) {
        return {
          type: config.get<'postgres'>('database.type'),
          host: await secret.getOrThrow('DATABASE_HOST'),
          port: parseInt(await secret.getOrThrow('DATABASE_PORT')),
          username: await secret.getOrThrow('DATABASE_USERNAME'),
          password: await secret.getOrThrow('DATABASE_PASSWORD'),
          database: await secret.getOrThrow('DATABASE_NAME'),
          entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
          synchronize: config.get('app.nodeEnv') !== NodeEnv.PRODUCTION,
          ssl: config.get<boolean>('database.ssl'),
          logging: true,
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
