import { Inject, Injectable, Logger } from "@nestjs/common";
import { RedisClientPoolType, type RedisClientType } from "redis";
import { type Result, ResultAsync } from "neverthrow";
import { REDIS_POOL } from "./redis-pool.provider.ts";
import { withBackoff } from "./redis.utils.ts";

export enum RedisServiceError {
  RedisError = "Redis Error",
  WatchConflict = "Watch Conflict",
}

@Injectable()
export class RedisService {
  private readonly keyPrefix = "lithello:";
  private readonly logger = new Logger(RedisService.name);
  private readonly maxRetries = 5;

  constructor(@Inject(REDIS_POOL) private readonly pool: RedisClientPoolType) {}

  get(key: string): ResultAsync<string | null, RedisServiceError> {
    return ResultAsync.fromPromise(this.pool.get(this.formatKey(key)), this.handleRedisError);
  }

  delete(key: string): ResultAsync<void, RedisServiceError> {
    return ResultAsync.fromPromise(this.pool.del(this.formatKey(key)), this.handleRedisError).map(
      () => undefined,
    );
  }

  withWatch<T, E>(
    key: string,
    operation: (client: RedisClientType, watchedKey: string) => Promise<Result<T, E>>,
  ): ResultAsync<T, E | RedisServiceError> {
    const formattedKey = this.formatKey(key);

    return new ResultAsync(
      withBackoff(
        () =>
          this.pool.execute(async (client) => {
            try {
              await client.watch(formattedKey);
              return await operation(client, formattedKey);
            } finally {
              if (client.isWatching) {
                await client.unwatch();
              }
            }
          }),
        this.handleRedisError,
        this.maxRetries,
      ),
    ).andThen((result) => result);
  }

  private readonly handleRedisError = (error: unknown): RedisServiceError => {
    this.logger.error(error);
    return RedisServiceError.RedisError;
  };

  private formatKey(key: string): string {
    return this.keyPrefix + key;
  }
}
