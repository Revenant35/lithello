import { Injectable } from "@nestjs/common";
import { type SessionID, type UserID, type LobbyMember } from "@lithello/shared/types";
import { toGameState } from "@lithello/shared/util";
import { err, ok, type Result, ResultAsync } from "neverthrow";
import {
  SessionRepository,
  SessionRepositoryError,
  type TransformResult,
} from "./session.repository.ts";
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

    // Resolve color assignment outside the transform so it's stable across retries.
    const assignHostAsBlack = Math.random() < 0.5;

    return this.repository.transact(
      sessionId,
      (session): Result<TransformResult, LobbyServiceError> => {
        if (session === null || session.phase !== "lobby") {
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
          return ok({ action: "noop" });
        }

        player.isReady = isReady;

        if (host.isReady && guest?.isReady) {
          return ok({
            action: "write",
            session: toGameState(session, {
              white: assignHostAsBlack ? guest : host,
              black: assignHostAsBlack ? host : guest,
            }),
          });
        }

        return ok({ action: "write", session });
      },
    );
  }
}
