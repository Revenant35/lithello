import { Injectable } from "@nestjs/common";
import {
  SessionRepository,
  SessionRepositoryError,
  type TransformResult,
} from "./session.repository.ts";
import { findPlayer, STARTING_CLOCK_MS } from "./session.utils.ts";
import { type ActiveClock, type IdleClock, SessionID, UserID } from "@lithello/shared/types";
import { toGameState } from "@lithello/shared/util";
import { err, ok, type Result, ResultAsync } from "neverthrow";
import { RedisServiceError } from "../redis/redis.service.ts";
import { ClockService } from "../clock.service.ts";

export enum RematchServiceError {
  NotInPostGame = "Not In Post-game",
  NotInSession = "Not In Session",
  UnknownError = "Unknown Error",
}

@Injectable()
export class PostGameService {
  constructor(
    private readonly repository: SessionRepository,
    private readonly clock: ClockService,
  ) {}

  rematchRequested(args: {
    userId: UserID;
    sessionId: SessionID;
  }): ResultAsync<void, RematchServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId } = args;

    return this.repository.transact(
      sessionId,
      (session): Result<TransformResult, RematchServiceError> => {
        if (session === null || session.phase !== "postgame") {
          return err(RematchServiceError.NotInPostGame);
        }

        if (!findPlayer(session.white, session.black, userId)) {
          return err(RematchServiceError.NotInSession);
        }

        if (
          session.rematchStatus.status === "requested" &&
          session.rematchStatus.requesterId === userId
        ) {
          return ok({ action: "noop" });
        }

        session.rematchStatus = { status: "requested", requesterId: userId };
        return ok({ action: "write", session });
      },
    );
  }

  rematchRequestAccepted(args: {
    userId: UserID;
    sessionId: SessionID;
  }): ResultAsync<void, RematchServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId } = args;

    return this.repository.transact(
      sessionId,
      (session): Result<TransformResult, RematchServiceError> => {
        if (session === null || session.phase !== "postgame") {
          return err(RematchServiceError.NotInPostGame);
        }

        if (!findPlayer(session.white, session.black, userId)) {
          return err(RematchServiceError.NotInSession);
        }

        if (
          session.rematchStatus.status !== "requested" ||
          session.rematchStatus.requesterId === userId
        ) {
          return err(RematchServiceError.UnknownError);
        }

        const now = this.clock.now();
        const idleClock: IdleClock = { kind: "idle", clockTimeMilliseconds: STARTING_CLOCK_MS };
        const activeClock: ActiveClock = {
          kind: "active",
          expiresAt: new Date(now.getTime() + STARTING_CLOCK_MS).toISOString(),
        };
        // Colors swap on rematch; black moves first, so the new black gets the active clock.
        const gameState = toGameState(session, {
          white: session.black,
          black: session.white,
          clock: idleClock,
        });
        gameState.black.clock = activeClock;
        return ok({ action: "write", session: gameState });
      },
    );
  }

  rematchRequestDenied(args: {
    userId: UserID;
    sessionId: SessionID;
  }): ResultAsync<void, RematchServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId } = args;

    return this.repository.transact(
      sessionId,
      (session): Result<TransformResult, RematchServiceError> => {
        if (session === null || session.phase !== "postgame") {
          return err(RematchServiceError.NotInPostGame);
        }

        if (!findPlayer(session.white, session.black, userId)) {
          return err(RematchServiceError.NotInSession);
        }

        if (
          session.rematchStatus.status !== "requested" ||
          session.rematchStatus.requesterId === userId
        ) {
          return err(RematchServiceError.UnknownError);
        }

        session.rematchStatus = { status: "idle" };
        return ok({ action: "write", session });
      },
    );
  }

  rematchRequestCancelled(args: {
    userId: UserID;
    sessionId: SessionID;
  }): ResultAsync<void, RematchServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId } = args;

    return this.repository.transact(
      sessionId,
      (session): Result<TransformResult, RematchServiceError> => {
        if (session === null || session.phase !== "postgame") {
          return err(RematchServiceError.NotInPostGame);
        }

        if (!findPlayer(session.white, session.black, userId)) {
          return err(RematchServiceError.NotInSession);
        }

        if (
          session.rematchStatus.status !== "requested" ||
          session.rematchStatus.requesterId !== userId
        ) {
          return ok({ action: "noop" });
        }

        session.rematchStatus = { status: "idle" };
        return ok({ action: "write", session });
      },
    );
  }
}
