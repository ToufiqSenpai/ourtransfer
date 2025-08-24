import { Global, Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { LogModule } from './log/log.module'
import { SecretModule } from './secret/secret.module';
import { DatabaseModule } from './database/database.module';
import { SecurityModule } from "./security/security.module"
import { StorageModule } from './storage/storage.module';
import { CacheModule } from './cache/cache.module';
import { EmailModule } from './email/email.module';
import { QueueModule } from './queue/queue.module';
import { MetricsModule } from './metrics/metrics.module'

@Global()
@Module({
  imports: [CacheModule, ConfigModule, DatabaseModule, EmailModule, LogModule, MetricsModule, QueueModule, SecretModule, SecurityModule, StorageModule],
})
export class InfrastructureModule {}
