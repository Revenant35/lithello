import { err, ok, type Result } from "neverthrow";
import { WatchError } from "redis";
import { RedisServiceError } from "./redis.service.ts";

export function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function withBackoff<T>(
  operation: () => T | Promise<T>,
  handleError: (error: unknown) => RedisServiceError,
  maxRetries: number,
): Promise<Result<T, RedisServiceError>> {
  for (let attempt = 0; ; attempt++) {
    try {
      return ok(await operation());
    } catch (error) {
      if (!(error instanceof WatchError)) {
        return err(handleError(error));
      }

      if (attempt >= maxRetries) {
        return err(RedisServiceError.WatchConflict);
      }

      await sleep(Math.random() * Math.min(250, 10 * 2 ** attempt));
    }
  }
}
