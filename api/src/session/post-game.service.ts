import { Injectable } from "@nestjs/common";
import { SessionRepository, SessionRepositoryError } from "./session.repository.ts";
import { PostGameMember, SessionID, UserID } from "@lithello/shared/types";
import { toGameState } from "@lithello/shared/util";
import { err, ok, ResultAsync } from "neverthrow";
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
    return this.repository.modifySession(sessionId, (session) => {
      if (session.phase !== "postgame") {
        return err(RematchServiceError.NotInPostGame);
      }

      let user: PostGameMember | undefined;
      if (userId === session.host.id) {
        user = session.host;
      } else if (userId === session.guest.id) {
        user = session.guest;
      }

      if (user === undefined) {
        return err(RematchServiceError.NotInSession);
      }

      if (user.isRequestingRematch) {
        return ok(null);
      }

      user.isRequestingRematch = true;
      return ok(session);
    });
  }

  rematchRequestAccepted(args: {
    userId: UserID;
    sessionId: SessionID;
  }): ResultAsync<void, RematchServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId } = args;
    return this.repository.modifySession(sessionId, (session) => {
      if (session.phase !== "postgame") {
        return err(RematchServiceError.NotInPostGame);
      }

      let user: PostGameMember | undefined;
      let opponent: PostGameMember | undefined;
      if (userId === session.host.id) {
        user = session.host;
        opponent = session.guest;
      } else if (userId === session.guest.id) {
        user = session.guest;
        opponent = session.host;
      }

      if (user === undefined) {
        return err(RematchServiceError.NotInSession);
      }

      if (!opponent || !opponent.isRequestingRematch) {
        return err(RematchServiceError.UnknownError);
      }

      session = toGameState(session, {
        whiteId: session.blackId,
        blackId: session.whiteId,
      });
      return ok(session);
    });
  }

  rematchRequestDenied(args: {
    userId: UserID;
    sessionId: SessionID;
  }): ResultAsync<void, RematchServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId } = args;
    return this.repository.modifySession(sessionId, (session) => {
      if (session.phase !== "postgame") {
        return err(RematchServiceError.NotInPostGame);
      }

      let user: PostGameMember | undefined;
      let opponent: PostGameMember | undefined;
      if (userId === session.host.id) {
        user = session.host;
        opponent = session.guest;
      } else if (userId === session.guest.id) {
        user = session.guest;
        opponent = session.host;
      }

      if (user === undefined) {
        return err(RematchServiceError.NotInSession);
      }

      if (!opponent || !opponent.isRequestingRematch) {
        return err(RematchServiceError.UnknownError);
      }

      opponent.isRequestingRematch = false;
      return ok(session);
    });
  }

  rematchRequestCancelled(args: {
    userId: UserID;
    sessionId: SessionID;
  }): ResultAsync<void, RematchServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId } = args;
    return this.repository.modifySession(sessionId, (session) => {
      if (session.phase !== "postgame") {
        return err(RematchServiceError.NotInPostGame);
      }

      let user: PostGameMember | undefined;
      if (userId === session.host.id) {
        user = session.host;
      } else if (userId === session.guest.id) {
        user = session.guest;
      }

      if (user === undefined) {
        return err(RematchServiceError.NotInSession);
      }

      if (!user.isRequestingRematch) {
        return ok(null);
      }

      user.isRequestingRematch = false;
      return ok(session);
    });
  }
}
