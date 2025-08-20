import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { SecretManager } from "../secret/secret-manager.abstract";

@Module({
  imports: [
    BullModule.forRootAsync({
      async useFactory(secret: SecretManager) {
        return {
          connection: {
            host: await secret.getOrThrow("REDIS_HOST"),
            port: parseInt(await secret.getOrThrow("REDIS_PORT"), 10) || 6379,
            db: 1
          },
        }
      },
      inject: [SecretManager]
    })
  ]
})
export class QueueModule {}
