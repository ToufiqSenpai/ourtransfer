import { Global, Module } from "@nestjs/common";
import { Redis } from "ioredis";
import { SecretManager } from "../secret/secret-manager.abstract";
import { CACHE } from "./cache.interface";
import { RedisCache } from "./redis.cache";

@Global()
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
    },
    {
      provide: CACHE,
      useClass: RedisCache
    }
  ],
  exports: [CACHE]
})
export class CacheModule {}
