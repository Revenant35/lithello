import { Injectable } from "@nestjs/common";
import { err, ok, ResultAsync } from "neverthrow";
import type { User } from "better-auth";
import { type SessionID, type UserID, type LobbyMember } from "@lithello/shared/types";
import { SessionRepository, SessionRepositoryError } from "./session.repository.ts";
import { RedisServiceError } from "../redis/redis.service.ts";

export enum SessionServiceError {
  SessionFull = "Session Full",
  LobbyClosed = "Lobby Closed",
  NotInSession = "Not In Session",
}

@Injectable()
export class SessionService {
  constructor(private readonly repository: SessionRepository) {}

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

    return this.repository.createOrModifySession(args.sessionId, (session) => {
      if (session === null) {
        return ok({
          id: args.sessionId,
          phase: "lobby",
          host: member,
          messages: [],
        });
      }

      if (session.host.id === member.id || session.guest?.id === member.id) {
        return ok(null);
      }

      if (session.phase !== "lobby") {
        return err(SessionServiceError.LobbyClosed);
      }

      if (session.guest != null) {
        return err(SessionServiceError.SessionFull);
      }

      return ok({ ...session, guest: member });
    });
  }

  leaveSession(args: {
    userId: UserID;
    sessionId: SessionID;
  }): ResultAsync<void, SessionServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId } = args;

    return this.repository.modifyOrDeleteSession(sessionId, (session) => {
      if (userId === session.guest?.id) {
        session.guest.isConnected = false;
        return ok(session);
      }

      if (userId === session.host.id) {
        if (session.guest !== undefined) {
          session.host = session.guest;
          return ok(session);
        } else {
          return ok(null);
        }
      }

      return err(SessionServiceError.NotInSession);
    });
  }
}
