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

  /**
   * Nest closes the adapter once per socket server, so this runs more than once.
   * The references are dropped first and `isOpen` is checked, because closing an
   * already-closed client throws and surfaces as a shutdown error.
   */
  override async close(server: Server): Promise<void> {
    const clients = [this.pubClient, this.subClient];

    this.pubClient = undefined;
    this.subClient = undefined;

    await Promise.all(
      clients.map((client) => (client?.isOpen === true ? client.close() : null)),
    );

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
