import { Inject, Injectable, Logger } from "@nestjs/common";
import { RedisClientPoolType, type RedisClientType, RedisJSON } from "redis";
import { err, ok, type Result, ResultAsync } from "neverthrow";
import { REDIS_POOL } from "./redis-pool.provider.ts";
import { withBackoff } from "./redis.utils.ts";

export enum RedisServiceError {
  Unknown = "Unknown",
  Conflict = "Conflict",
  NotFound = "Not Found",
  WatchConflict = "Watch Conflict",
}

@Injectable()
export class RedisService {
  private readonly keyPrefix = "lithello:";
  private readonly logger = new Logger(RedisService.name);
  private readonly maxRetries = 5;

  constructor(@Inject(REDIS_POOL) private readonly pool: RedisClientPoolType) {}

  getJson(args: { key: string; path?: string }): ResultAsync<RedisJSON, RedisServiceError> {
    const { key, path } = args;

    return ResultAsync.fromPromise(
      this.pool.json.get(this.formatKey(key), { path }),
      this.handleRedisError,
    );
  }

  setJson(args: {
    key: string;
    value: RedisJSON;
    path?: string;
    condition: "NX" | "XX" | undefined;
  }): ResultAsync<void, RedisServiceError> {
    const { key, value, path, condition } = args;

    return ResultAsync.fromPromise(
      this.pool.json.set(key, path ?? "$", value, { condition }),
      this.handleRedisError,
    ).andThen((result) => {
      if (result === "OK") {
        return ok();
      }

      if (condition === "NX") {
        return err(RedisServiceError.Conflict);
      }

      if (condition === "XX") {
        return err(RedisServiceError.NotFound);
      }

      return err(RedisServiceError.Unknown);
    });
  }

  deleteJson(args: { key: string; path?: string }): ResultAsync<void, RedisServiceError> {
    const { key, path } = args;

    return ResultAsync.fromPromise(
      this.pool.json.del(this.formatKey(key), { path }),
      this.handleRedisError,
    ).map(() => undefined);
  }


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
    return RedisServiceError.Unknown;
  };

  private formatKey(key: string): string {
    return this.keyPrefix + key;
  }
}
