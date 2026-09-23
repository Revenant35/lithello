import { Injectable } from "@nestjs/common";
import type {
  GameCompletion,
  GameState,
  PlayerColor,
  SessionID,
  TurnAction,
  UserID,
} from "@lithello/shared/types";
import {
  getOpponentColor,
  getValidMoveLocations,
  getPlayerScore,
  performMove,
  toPostGameState,
} from "@lithello/shared/util";
import { err, ok, type Result, ResultAsync } from "neverthrow";
import {
  SessionRepository,
  SessionRepositoryError,
  type TransformResult,
} from "./session.repository.ts";
import { RedisServiceError } from "../redis/redis.service.ts";
import { findPlayer } from "./session.utils.ts";

export enum GameServiceError {
  NotInGame = "Not In Game",
  NotInSession = "Not In Session",
  NotYourTurn = "Not Your Turn",
  IllegalMove = "Illegal Move",
  NoDrawOffer = "No Draw Offer",
  UnknownError = "Unknown Error",
}

function resolveCompletion(session: GameState): GameCompletion {
  const whiteScore = getPlayerScore(session.board, "w");
  const blackScore = getPlayerScore(session.board, "b");
  if (whiteScore > blackScore) return { reason: "victory", winnerId: session.white.id };
  if (blackScore > whiteScore) return { reason: "victory", winnerId: session.black.id };
  return { reason: "draw" };
}

@Injectable()
export class GameService {
  constructor(private readonly repository: SessionRepository) {}

  action(args: {
    userId: UserID;
    sessionId: SessionID;
    action: TurnAction;
  }): ResultAsync<void, GameServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId, action } = args;

    return this.repository.transact(
      sessionId,
      (session): Result<TransformResult, GameServiceError> => {
        if (session === null || session.phase !== "game") {
          return err(GameServiceError.NotInGame);
        }

        if (session.activePlayerId !== userId) {
          return err(GameServiceError.NotYourTurn);
        }

        const playerColor: PlayerColor = session.white.id === userId ? "w" : "b";
        const opponentColor = getOpponentColor(playerColor);
        const opponentId = playerColor === "w" ? session.black.id : session.white.id;

        if (action.kind === "pass") {
          // A pass is only legal when the active player has no valid moves.
          if (getValidMoveLocations(session.board, playerColor).length > 0) {
            return err(GameServiceError.IllegalMove);
          }

          session.history.push(action);

          if (getValidMoveLocations(session.board, opponentColor).length === 0) {
            // Neither player can move — game over by score.
            return ok({
              action: "write",
              session: toPostGameState(session, resolveCompletion(session)),
            });
          }

          session.activePlayerId = opponentId;
          return ok({ action: "write", session });
        }

        // kind === "move"
        const moveResult = performMove(session.board, action.location, playerColor);
        if (moveResult.isErr()) {
          return err(GameServiceError.IllegalMove);
        }

        session.board = moveResult.value;
        session.history.push(action);

        if (getValidMoveLocations(session.board, opponentColor).length > 0) {
          session.activePlayerId = opponentId;
          return ok({ action: "write", session });
        }

        if (getValidMoveLocations(session.board, playerColor).length > 0) {
          // Active player goes again (opponent must pass).
          return ok({ action: "write", session });
        }

        // Neither player can move — game over by score.
        return ok({
          action: "write",
          session: toPostGameState(session, resolveCompletion(session)),
        });
      },
    );
  }

  drawOffered(args: {
    userId: UserID;
    sessionId: SessionID;
  }): ResultAsync<void, GameServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId } = args;

    return this.repository.transact(
      sessionId,
      (session): Result<TransformResult, GameServiceError> => {
        if (session === null || session.phase !== "game") {
          return err(GameServiceError.NotInGame);
        }

        if (!findPlayer(session.white, session.black, userId)) {
          return err(GameServiceError.NotInSession);
        }

        if (session.drawStatus.status === "offered" && session.drawStatus.offererId === userId) {
          return ok({ action: "noop" });
        }

        session.drawStatus = { status: "offered", offererId: userId };
        return ok({ action: "write", session });
      },
    );
  }

  drawOfferAccepted(args: {
    userId: UserID;
    sessionId: SessionID;
  }): ResultAsync<void, GameServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId } = args;

    return this.repository.transact(
      sessionId,
      (session): Result<TransformResult, GameServiceError> => {
        if (session === null || session.phase !== "game") {
          return err(GameServiceError.NotInGame);
        }

        if (!findPlayer(session.white, session.black, userId)) {
          return err(GameServiceError.NotInSession);
        }

        if (session.drawStatus.status !== "offered" || session.drawStatus.offererId === userId) {
          return err(GameServiceError.NoDrawOffer);
        }

        return ok({ action: "write", session: toPostGameState(session, { reason: "draw" }) });
      },
    );
  }

  drawOfferDenied(args: {
    userId: UserID;
    sessionId: SessionID;
  }): ResultAsync<void, GameServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId } = args;

    return this.repository.transact(
      sessionId,
      (session): Result<TransformResult, GameServiceError> => {
        if (session === null || session.phase !== "game") {
          return err(GameServiceError.NotInGame);
        }

        if (!findPlayer(session.white, session.black, userId)) {
          return err(GameServiceError.NotInSession);
        }

        if (session.drawStatus.status !== "offered" || session.drawStatus.offererId === userId) {
          return err(GameServiceError.NoDrawOffer);
        }

        session.drawStatus = { status: "idle" };
        return ok({ action: "write", session });
      },
    );
  }

  drawOfferCancelled(args: {
    userId: UserID;
    sessionId: SessionID;
  }): ResultAsync<void, GameServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId } = args;

    return this.repository.transact(
      sessionId,
      (session): Result<TransformResult, GameServiceError> => {
        if (session === null || session.phase !== "game") {
          return err(GameServiceError.NotInGame);
        }

        if (!findPlayer(session.white, session.black, userId)) {
          return err(GameServiceError.NotInSession);
        }

        if (session.drawStatus.status !== "offered" || session.drawStatus.offererId !== userId) {
          return ok({ action: "noop" });
        }

        session.drawStatus = { status: "idle" };
        return ok({ action: "write", session });
      },
    );
  }

  resigned(args: {
    userId: UserID;
    sessionId: SessionID;
  }): ResultAsync<void, GameServiceError | SessionRepositoryError | RedisServiceError> {
    const { userId, sessionId } = args;

    return this.repository.transact(
      sessionId,
      (session): Result<TransformResult, GameServiceError> => {
        if (session === null || session.phase !== "game") {
          return err(GameServiceError.NotInGame);
        }

        if (!findPlayer(session.white, session.black, userId)) {
          return err(GameServiceError.NotInSession);
        }

        const opponent = session.white.id === userId ? session.black : session.white;
        opponent.wins++;

        return ok({
          action: "write",
          session: toPostGameState(session, { reason: "resignation", resignerId: userId }),
        });
      },
    );
  }
}
