import { Injectable } from "@nestjs/common";
import type {
  GameMember,
  SessionID,
  SessionState,
  TurnAction,
  UserID,
} from "@lithello/shared/types";
import { toPostGameState } from "@lithello/shared/util";
import { err, ok, ResultAsync } from "neverthrow";
import { SessionRepository, SessionRepositoryError } from "./session.repository.ts";
import { RedisServiceError } from "../redis/redis.service.ts";

export enum GameServiceError {
  NotInGame = "Not In Game",
  NotInSession = "Not In Session",
  NoDrawOffer = "No Draw Offer",
  UnknownError = "Unknown Error",
}

@Injectable()
export class GameService {
  constructor(private readonly repository: SessionRepository) {}

  async action(
    _userId: string,
    _sessionId: string,
    _action: TurnAction,
  ): Promise<SessionState | null> {
    return null;
  }

  drawOffered(args: {
    userId: UserID;
    sessionId: SessionID;
  }): ResultAsync<void, GameServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId } = args;
    return this.repository.modifySession(sessionId, (session) => {
      if (session.phase !== "game") {
        return err(GameServiceError.NotInGame);
      }

      let user: GameMember | undefined;
      if (userId === session.host.id) {
        user = session.host;
      } else if (userId === session.guest.id) {
        user = session.guest;
      }

      if (user === undefined) {
        return err(GameServiceError.NotInSession);
      }

      if (user.isOfferingDraw) {
        return ok(null);
      }

      user.isOfferingDraw = true;
      return ok(session);
    });
  }

  drawOfferAccepted(args: {
    userId: UserID;
    sessionId: SessionID;
  }): ResultAsync<void, GameServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId } = args;
    return this.repository.modifySession(sessionId, (session) => {
      if (session.phase !== "game") {
        return err(GameServiceError.NotInGame);
      }

      let user: GameMember | undefined;
      let opponent: GameMember | undefined;
      if (userId === session.host.id) {
        user = session.host;
        opponent = session.guest;
      } else if (userId === session.guest.id) {
        user = session.guest;
        opponent = session.host;
      }

      if (user === undefined) {
        return err(GameServiceError.NotInSession);
      }

      if (opponent === undefined) {
        return err(GameServiceError.UnknownError);
      }

      if (!opponent.isOfferingDraw) {
        return err(GameServiceError.NoDrawOffer);
      }

      session = toPostGameState(session, {
        reason: "draw",
      });

      return ok(session);
    });
  }

  drawOfferDenied(args: {
    userId: UserID;
    sessionId: SessionID;
  }): ResultAsync<void, GameServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId } = args;
    return this.repository.modifySession(sessionId, (session) => {
      if (session.phase !== "game") {
        return err(GameServiceError.NotInGame);
      }

      let user: GameMember | undefined;
      let opponent: GameMember | undefined;
      if (userId === session.host.id) {
        user = session.host;
        opponent = session.guest;
      } else if (userId === session.guest.id) {
        user = session.guest;
        opponent = session.host;
      }

      if (user === undefined) {
        return err(GameServiceError.NotInSession);
      }

      if (opponent === undefined) {
        return err(GameServiceError.UnknownError);
      }

      if (!opponent.isOfferingDraw) {
        return err(GameServiceError.NoDrawOffer);
      }

      opponent.isOfferingDraw = false;
      return ok(session);
    });
  }

  drawOfferCancelled(args: {
    userId: UserID;
    sessionId: SessionID;
  }): ResultAsync<void, GameServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId } = args;
    return this.repository.modifySession(sessionId, (session) => {
      if (session.phase !== "game") {
        return err(GameServiceError.NotInGame);
      }

      let user: GameMember | undefined;
      if (userId === session.host.id) {
        user = session.host;
      } else if (userId === session.guest.id) {
        user = session.guest;
      }

      if (user === undefined) {
        return err(GameServiceError.NotInSession);
      }

      if (!user.isOfferingDraw) {
        return ok(null);
      }

      user.isOfferingDraw = false;
      return ok(session);
    });
  }

  resigned(args: {
    userId: UserID;
    sessionId: SessionID;
  }): ResultAsync<void, GameServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId } = args;
    return this.repository.modifySession(sessionId, (session) => {
      if (session.phase !== "game") {
        return err(GameServiceError.NotInGame);
      }

      let user: GameMember | undefined;
      let opponent: GameMember | undefined;
      if (userId === session.host.id) {
        user = session.host;
        opponent = session.guest;
      } else if (userId === session.guest.id) {
        user = session.guest;
        opponent = session.host;
      }

      if (user === undefined) {
        return err(GameServiceError.NotInSession);
      }

      if (opponent === undefined) {
        return err(GameServiceError.UnknownError);
      }

      opponent.wins++;
      session = toPostGameState(session, {
        reason: "resignation",
        resignerId: userId,
      });

      return ok(session);
    });
  }
}
