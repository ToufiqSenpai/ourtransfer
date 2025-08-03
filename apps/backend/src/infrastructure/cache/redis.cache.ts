import { Injectable } from "@nestjs/common";
import { Cache } from "./cache.interface";
import Redis from "ioredis";

@Injectable()
export class RedisCache implements Cache {
  public constructor(private readonly redis: Redis) {}

  public async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const stringValue = JSON.stringify(value);
    if (ttl) {
      await this.redis.set(key, stringValue, 'EX', ttl);
    } else {
      await this.redis.set(key, stringValue);
    }
  }

  public async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  public async clear(): Promise<void> {
    const keys = await this.redis.keys('*');
    if (keys.length) {
      await this.redis.del(keys);
    }
  }
}
