import { Injectable, Logger } from "@nestjs/common";
import { type SessionID, type SessionState, SessionStateSchema } from "@lithello/shared/types";

import { RedisService, RedisServiceError } from "../redis/redis.service.ts";
import { err, ok, Result, ResultAsync } from "neverthrow";
import type { RedisClientType } from "redis";

export enum SessionRepositoryError {
  InvalidSession = "Invalid Session",
  SessionNotFound = "Session Not Found",
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

  createSession(session: SessionState): ResultAsync<void, RedisServiceError> {
    const key = this.formatKey(session.id);
    return this.redis.set(key, JSON.stringify(session), { condition: "NX" });
  }

  updateSession(id: SessionID, session: SessionState): ResultAsync<void, RedisServiceError> {
    const key = this.formatKey(id);
    return this.redis.set(key, JSON.stringify(session), { condition: "XX" });
  }

  modifySession<E>(
    id: SessionID,
    transform: (session: SessionState) => Result<SessionState | null, E>,
  ): ResultAsync<void, E | SessionRepositoryError | RedisServiceError> {
    return this.redis.withWatch(
      this.formatKey(id),
      async (client: RedisClientType, key: string) => {
        const raw = await client.get(key);

        if (raw === null) {
          return err(SessionRepositoryError.SessionNotFound);
        }

        const decoded = decodeSession(raw, this.logger);
        if (decoded.isErr()) return err(decoded.error);

        const changed = transform(decoded.value);
        if (changed.isErr()) return err(changed.error);

        const next = changed.value;
        if (next === null) return ok(undefined);

        if (next.id !== id) {
          return err(SessionRepositoryError.InvalidSession);
        }

        await client.multi().set(key, JSON.stringify(next)).exec();
        return ok(undefined);
      },
    );
  }

  createOrModifySession<E>(
    id: SessionID,
    transform: (session: SessionState | null) => Result<SessionState | null, E>,
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

        const changed = transform(session);
        if (changed.isErr()) return err(changed.error);

        const next = changed.value;
        if (next === null) return ok(undefined);

        if (next.id !== id) {
          return err(SessionRepositoryError.InvalidSession);
        }

        await client.multi().set(key, JSON.stringify(next)).exec();
        return ok(undefined);
      },
    );
  }

  modifyOrDeleteSession<E>(
    id: SessionID,
    transform: (session: SessionState) => Result<SessionState | null, E>,
  ): ResultAsync<void, E | SessionRepositoryError | RedisServiceError> {
    return this.redis.withWatch(
      this.formatKey(id),
      async (client: RedisClientType, key: string) => {
        const raw = await client.get(key);

        if (raw === null) {
          return err(SessionRepositoryError.SessionNotFound);
        }

        const decoded = decodeSession(raw, this.logger);
        if (decoded.isErr()) return err(decoded.error);

        const changed = transform(decoded.value);
        if (changed.isErr()) return err(changed.error);

        const next = changed.value;
        if (next === null) {
          await client.multi().del(key).exec();
          return ok(undefined);
        }

        if (next.id !== id) {
          return err(SessionRepositoryError.InvalidSession);
        }

        await client.multi().set(key, JSON.stringify(next)).exec();
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
