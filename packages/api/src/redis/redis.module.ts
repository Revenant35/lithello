import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { provideRedisPool, REDIS_POOL } from './redis-pool.provider.js';
import type { RedisClientPoolType } from 'redis';

@Module({
  imports: [],
  providers: [provideRedisPool()],
  exports: [REDIS_POOL],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_POOL) private readonly pool: RedisClientPoolType) {}

  async onApplicationShutdown() {
    await this.pool.close();
  }
}
