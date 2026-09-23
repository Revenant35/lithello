import { Injectable } from "@nestjs/common";
import {
  SessionRepository,
  SessionRepositoryError,
  type TransformResult,
} from "./session.repository.ts";
import { findPlayer } from "./session.utils.ts";
import { SessionID, UserID } from "@lithello/shared/types";
import { toGameState } from "@lithello/shared/util";
import { err, ok, type Result, ResultAsync } from "neverthrow";
import { RedisServiceError } from "../redis/redis.service.ts";

export enum RematchServiceError {
  NotInPostGame = "Not In Post-game",
  NotInSession = "Not In Session",
  UnknownError = "Unknown Error",
}

@Injectable()
export class PostGameService {
  constructor(private readonly repository: SessionRepository) {}

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

        if (!findPlayer(session.host, session.guest, userId)) {
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

        if (!findPlayer(session.host, session.guest, userId)) {
          return err(RematchServiceError.NotInSession);
        }

        if (
          session.rematchStatus.status !== "requested" ||
          session.rematchStatus.requesterId === userId
        ) {
          return err(RematchServiceError.UnknownError);
        }

        return ok({
          action: "write",
          session: toGameState(session, {
            whiteId: session.blackId,
            blackId: session.whiteId,
          }),
        });
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

        if (!findPlayer(session.host, session.guest, userId)) {
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

        if (!findPlayer(session.host, session.guest, userId)) {
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
