import { Global, Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { LoggerModule } from './logger/logger.module';
import { SecretModule } from './secret/secret.module';
import { DatabaseModule } from './database/database.module';
import { SecurityModule } from "./security/security.module"
import { StorageModule } from './storage/storage.module';

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule, LoggerModule, SecretModule, SecurityModule, StorageModule],
})
export class InfrastructureModule {}
