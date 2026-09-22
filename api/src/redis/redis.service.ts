import { Inject, Injectable, Logger } from "@nestjs/common";
import { RedisClientPoolType, type RedisClientType, WatchError } from "redis";
import { err, ok, type Result, ResultAsync } from "neverthrow";
import { REDIS_POOL } from "./redis-pool.provider.ts";

export enum RedisServiceError {
  RedisError = "Redis Error",
  WatchConflict = "Watch Conflict",
  AlreadyExists = "Already Exists",
  DoesNotExist = "Does Not Exist",
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

  set(
    key: string,
    value: string,
    options?: { condition: "NX" | "XX" | undefined },
  ): ResultAsync<void, RedisServiceError> {
    return ResultAsync.fromPromise(
      this.pool.set(this.formatKey(key), value, options),
      this.handleRedisError,
    ).andThen((result) => {
      if (result === null) {
        if (options?.condition === "NX") {
          return err(RedisServiceError.AlreadyExists);
        }

        if (options?.condition === "XX") {
          return err(RedisServiceError.DoesNotExist);
        }

        return err(RedisServiceError.RedisError);
      }

      return ok(undefined);
    });
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
      this.withBackoff(() =>
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

  private sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  private async withBackoff<T>(
    operation: () => T | Promise<T>,
  ): Promise<Result<T, RedisServiceError>> {
    for (let attempt = 0; ; attempt++) {
      try {
        return ok(await operation());
      } catch (error) {
        if (!(error instanceof WatchError)) {
          return err(this.handleRedisError(error));
        }

        if (attempt >= this.maxRetries) {
          return err(RedisServiceError.WatchConflict);
        }

        const delay = Math.random() * Math.min(250, 10 * 2 ** attempt);

        await this.sleep(delay);
      }
    }
  }
}
