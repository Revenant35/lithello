import { Injectable } from "@nestjs/common";
import { type SessionID, type UserID, type LobbyMember } from "@lithello/shared/types";
import { err, ok, ResultAsync } from "neverthrow";
import { SessionRepository, SessionRepositoryError } from "./session.repository.ts";
import { RedisServiceError } from "../redis/redis.service.ts";

export enum LobbyServiceError {
  LobbyClosed = "Lobby Closed",
  NotInSession = "Not In Session",
}

@Injectable()
export class LobbyService {
  constructor(private readonly repository: SessionRepository) {}

  setReady(args: {
    userId: UserID;
    sessionId: SessionID;
    isReady: boolean;
  }): ResultAsync<void, LobbyServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId, isReady } = args;

    return this.repository.modifySession(sessionId, (session) => {
      if (session.phase !== "lobby") {
        return err(LobbyServiceError.LobbyClosed);
      }

      const { host, guest } = session;
      const isHost = host.id === userId;
      const isGuest = guest?.id === userId;

      if (!isHost && !isGuest) {
        return err(LobbyServiceError.NotInSession);
      }

      const player = isHost ? host : (guest as LobbyMember);

      if (player.isReady === isReady) {
        return ok(null);
      }

      const updated = { ...player, isReady };

      // TODO: If both players are readied up, transition to game

      return ok(isHost ? { ...session, host: updated } : { ...session, guest: updated });
    });
  }
}
