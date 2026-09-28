import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Server, ServerOptions } from 'socket.io';
import { REDIS_CLIENT } from './redis-client.provider.ts';
import type { AppRedisClient } from './app-redis-client.type.ts';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | undefined;
  private pubClient: AppRedisClient | undefined;
  private subClient: AppRedisClient | undefined;

  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const redis = this.app.get<AppRedisClient>(REDIS_CLIENT);

    const pubClient = redis.duplicate();
    const subClient = redis.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.pubClient = pubClient;
    this.subClient = subClient;
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  override async close(server: Server): Promise<void> {
    await Promise.all([this.pubClient?.close(), this.subClient?.close()]);
    await super.close(server);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    if (!this.adapterConstructor) {
      this.logger.fatal(
        'adapterConstructor is undefined when calling createIOServer!',
      );
      process.exit(1);
    }

    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
