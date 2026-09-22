import { Logger, Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClientPool } from "redis";

export const REDIS_POOL = Symbol("REDIS_POOL");

export function provideRedisPool(): Provider {
  return {
    provide: REDIS_POOL,
    inject: [ConfigService],
    useFactory: async (config: ConfigService) => {
      const logger = new Logger("Redis Pool");
      const pool = createClientPool(
        {
          socket: {
            host: config.getOrThrow<string>("REDIS_HOST"),
            port: Number(config.getOrThrow<string | number>("REDIS_PORT")),
          },
        },
        {
          maximum: Number(config.getOrThrow<string | number>("REDIS_POOL_SIZE")),
        },
      );

      pool.on("error", (error) => logger.error(error));
      await pool.connect();

      return pool;
    },
  };
}
