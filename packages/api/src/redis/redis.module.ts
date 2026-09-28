import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { provideRedisClient, REDIS_CLIENT } from './redis-client.provider.ts';
import { type AppRedisClient } from './app-redis-client.type.ts';

@Module({
  imports: [],
  providers: [provideRedisClient()],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: AppRedisClient) {}

  async onApplicationShutdown() {
    await this.redis.close();
  }
}
