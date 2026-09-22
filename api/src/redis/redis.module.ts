import { Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { RedisClientPoolType } from "redis";
import { RedisService } from "./redis.service.ts";
import { provideRedisPool, REDIS_POOL } from "./redis-pool.provider.ts";

@Module({
  providers: [provideRedisPool(), RedisService],
  exports: [RedisService],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_POOL) private readonly pool: RedisClientPoolType) {}

  async onApplicationShutdown() {
    await this.pool.close();
  }
}
