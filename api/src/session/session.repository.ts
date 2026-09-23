import { Injectable, Logger } from "@nestjs/common";
import { type SessionID, type SessionState, SessionStateSchema } from "@lithello/shared/types";

import { RedisService, RedisServiceError } from "../redis/redis.service.ts";
import { err, ok, Result, ResultAsync } from "neverthrow";
import { type RedisClientType, WatchError } from "redis";

export enum SessionRepositoryError {
  InvalidSession = "Invalid Session",
}

/**
 * Explicit intent returned by a transform passed to `modify` or `createOrModify`.
 *
 * - `write`  — persist the new session state
 * - `delete` — remove the session from Redis
 * - `noop`   — leave Redis unchanged (e.g. idempotent action already applied)
 */
export type TransformResult =
  | { action: "write"; session: SessionState }
  | { action: "delete" }
  | { action: "noop" };

// exec() returns null when the WATCHed key was modified before EXEC ran.
// Throwing WatchError here lets withBackoff catch it and retry the operation.
async function execOrRetry(pipeline: ReturnType<RedisClientType["multi"]>): Promise<void> {
  const result = await pipeline.exec();
  if (result === null) {
    throw new WatchError();
  }
}

function decodeSession(raw: string, logger: Logger): Result<SessionState, SessionRepositoryError> {
  return Result.fromThrowable(
    () => SessionStateSchema.parse(JSON.parse(raw)),
    (error) => {
      logger.error(error);
      return SessionRepositoryError.InvalidSession;
    },
  )();
}

@Injectable()
export class SessionRepository {
  private readonly keyPrefix = "session:v1:";
  private readonly logger = new Logger(SessionRepository.name);

  constructor(private readonly redis: RedisService) {}

  getSession(
    id: SessionID,
  ): ResultAsync<SessionState | null, SessionRepositoryError | RedisServiceError> {
    const key = this.formatKey(id);
    return this.redis.get(key).andThen((res) => {
      if (res === null) {
        return ok(null);
      }

      return decodeSession(res, this.logger);
    });
  }

  /**
   * Atomically read a session (or null if absent), apply a transform, and act on the result.
   * Callers that require the session to exist should return an error when they receive null.
   */
  transact<E>(
    id: SessionID,
    transform: (session: SessionState | null) => Result<TransformResult, E>,
  ): ResultAsync<void, E | SessionRepositoryError | RedisServiceError> {
    return this.redis.withWatch(
      this.formatKey(id),
      async (client: RedisClientType, key: string) => {
        const raw = await client.get(key);

        let session: SessionState | null = null;
        if (raw !== null) {
          const decoded = decodeSession(raw, this.logger);
          if (decoded.isErr()) return err(decoded.error);
          session = decoded.value;
        }

        const result = transform(session !== null ? structuredClone(session) : null);
        if (result.isErr()) return err(result.error);

        const outcome = result.value;

        if (outcome.action === "noop") return ok(undefined);
        if (outcome.action === "delete") {
          await execOrRetry(client.multi().del(key));
          return ok(undefined);
        }

        await execOrRetry(client.multi().set(key, JSON.stringify(outcome.session)));
        return ok(undefined);
      },
    );
  }

  deleteSession(id: SessionID): ResultAsync<void, RedisServiceError> {
    const key = this.formatKey(id);
    return this.redis.delete(key);
  }

  private formatKey(sessionId: SessionID): string {
    return this.keyPrefix + sessionId;
  }
}
