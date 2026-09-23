import { Injectable } from "@nestjs/common";
import { err, ok, type Result, ResultAsync } from "neverthrow";
import type { User } from "better-auth";
import {
  type SessionID,
  type SessionState,
  type UserID,
  type LobbyMember,
  type SessionMessage,
} from "@lithello/shared/types";
import {
  SessionRepository,
  SessionRepositoryError,
  type TransformResult,
} from "./session.repository.ts";
import { RedisServiceError } from "../redis/redis.service.ts";

export enum SessionServiceError {
  SessionFull = "Session Full",
  LobbyClosed = "Lobby Closed",
  NotInSession = "Not In Session",
  MessageTooLong = "Message Too Long",
}

const MAX_MESSAGE_LENGTH = 500;

@Injectable()
export class SessionService {
  constructor(private readonly repository: SessionRepository) {}

  getSession(
    sessionId: SessionID,
  ): ResultAsync<SessionState | null, SessionRepositoryError | RedisServiceError> {
    return this.repository.getSession(sessionId);
  }

  enterSession(args: {
    user: User;
    sessionId: SessionID;
  }): ResultAsync<void, SessionServiceError | SessionRepositoryError | RedisServiceError> {
    const member: LobbyMember = {
      id: args.user.id as UserID,
      name: args.user.name,
      isConnected: true,
      wins: 0,
      isReady: false,
    };

    return this.repository.transact(
      args.sessionId,
      (session): Result<TransformResult, SessionServiceError> => {
        if (session === null) {
          return ok({
            action: "write",
            session: {
              id: args.sessionId,
              phase: "lobby",
              host: member,
              messages: [],
            },
          });
        }

        if (session.phase !== "lobby") {
          return err(SessionServiceError.LobbyClosed);
        }

        if (session.host.id === member.id) {
          session.host.isConnected = true;
          return ok({ action: "write", session });
        }

        if (session.guest?.id === member.id) {
          session.guest.isConnected = true;
          return ok({ action: "write", session });
        }

        if (session.guest != null) {
          return err(SessionServiceError.SessionFull);
        }

        session.guest = member;
        return ok({ action: "write", session });

        // TODO: Handle reconnection for game and postgame phases now that they
        // use white/black instead of host/guest for player members.
      },
    );
  }

  sendMessage(args: {
    userId: UserID;
    sessionId: SessionID;
    content: string;
  }): ResultAsync<void, SessionServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId, content } = args;

    if (content.trim().length === 0) {
      return ResultAsync.fromSafePromise(Promise.resolve(undefined));
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      return ResultAsync.fromSafePromise(Promise.resolve(undefined)).andThen(() =>
        err(SessionServiceError.MessageTooLong),
      );
    }

    const message: SessionMessage = { authorId: userId, content: content.trim() };

    return this.repository.transact(
      sessionId,
      (session): Result<TransformResult, SessionServiceError> => {
        if (session === null) return err(SessionServiceError.NotInSession);
        session.messages.push(message);
        return ok({ action: "write", session });
      },
    );
  }

  leaveSession(args: {
    userId: UserID;
    sessionId: SessionID;
  }): ResultAsync<void, SessionServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId } = args;

    return this.repository.transact(
      sessionId,
      (session): Result<TransformResult, SessionServiceError> => {
        if (session === null) return err(SessionServiceError.NotInSession);

        // TODO: Handle mid-game / post-game disconnects now that game and postgame
        // states use white/black instead of host/guest for player members.
        if (session.phase !== "lobby") {
          return ok({ action: "noop" });
        }

        const isHost = userId === session.host.id;
        const isGuest = userId === session.guest?.id;

        if (!isHost && !isGuest) {
          return err(SessionServiceError.NotInSession);
        }

        // Lobby: guest leaves — mark disconnected.
        if (isGuest) {
          session.guest!.isConnected = false;
          return ok({ action: "write", session });
        }

        // Lobby: host leaves — promote guest to host, or delete if empty.
        if (session.guest !== undefined) {
          session.host = session.guest;
          session.guest = undefined;
          return ok({ action: "write", session });
        }

        return ok({ action: "delete" });
      },
    );
  }
}
