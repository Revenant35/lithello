import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.ts';
import { RedisIoAdapter } from './redis/redis-io.adapter.ts';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
