import { Module } from "@nestjs/common";
import { Redis } from "ioredis";
import { SecretManager } from "../secret/secret-manager.abstract";

@Module({
  providers: [
    {
      provide: Redis,
      async useFactory(secret: SecretManager): Promise<Redis> {
        return new Redis({
          host: await secret.getOrThrow("REDIS_HOST"),
          port: parseInt(await secret.getOrThrow("REDIS_PORT"), 10) || 6379,
        });
      },
      inject: [SecretManager]
    }
  ]
})
export class CacheModule {}
