import { Injectable, Logger } from '@nestjs/common';
import {
  type GameState,
  type GameID,
  type GameSummary,
  type Board,
  UserID,
  BoardLocation,
  GameMessageContent,
  PlayerColor,
} from '@lithello/shared';
import { err, ok, Result } from 'neverthrow';
import { Subject } from 'rxjs';
import { GameRepository, GameRepositoryError } from './game.repository.ts';
import { GameTasks } from './game.tasks.ts';
import {
  getGameScore,
  getOpponentColor,
  getValidMoveLocations, performMove,
} from './game.utils.ts';

const MATCH_HISTORY_LIMIT = 10;

export enum GameServiceError {
  NotFound = 'Not Found',
  Unauthorized = 'Unauthorized',
  IllegalMove = 'Illegal Move',
  UnknownError = 'Unknown Error',
}

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  private readonly _gameChanged$ = new Subject<GameID>();
  public readonly gameChanged$ = this._gameChanged$.asObservable();

  constructor(
    private readonly repository: GameRepository,
    private readonly tasks: GameTasks,
  ) {
    this.tasks.clockExpired$.subscribe(({ gameId, userId }) => {
      this.handleClockExpired({ gameId, userId }).catch((error) =>
        this.logger.error(error),
      );
    });
  }

  async createGame(args: {
    whiteId: UserID;
    blackId: UserID;
    startClockMs: number;
  }): Promise<
    Result<{ gameId: GameID; state: GameState }, GameServiceError>
  > {
    const result = await this.repository.createGame(args);
    if (result.isErr()) {
      return err(this.mapRepositoryError(result.error));
    }

    const { gameId, state } = result.value;

    if (state.status === 'active') {
      const activeMember =
        state.activePlayer === 'w' ? state.white : state.black;

      if (activeMember.clock.kind === 'active') {
        this.tasks.scheduleClock({
          gameId,
          userId: activeMember.id,
          expiresAt: activeMember.clock.expiresAt,
        });
      }
    }

    return ok({ gameId, state });
  }

  async getState(args: {
    gameId: GameID;
  }): Promise<Result<GameState, GameServiceError>> {
    const { gameId } = args;

    const result = await this.repository.getGame({ gameId });
    if (result.isErr()) {
      return err(this.mapRepositoryError(result.error));
    }

    return ok(result.value);
  }

  async getMatchHistory(args: {
    userId: UserID;
  }): Promise<Result<GameSummary[], GameServiceError>> {
    const { userId } = args;

    const result = await this.repository.listFinishedGames({
      userId,
      limit: MATCH_HISTORY_LIMIT,
    });
    if (result.isErr()) {
      return err(this.mapRepositoryError(result.error));
    }

    return ok(result.value);
  }

  async move(args: {
    gameId: GameID;
    userId: UserID;
    location: BoardLocation;
  }): Promise<Result<GameState, GameServiceError>> {
    const { gameId, userId, location } = args;

    const stateResult = await this.getState({ gameId });
    if (stateResult.isErr()) {
      return err(stateResult.error);
    }

    const state = stateResult.value;
    if (state.status !== 'active') {
      return err(GameServiceError.IllegalMove);
    }

    const playerColor = this.getPlayerColor(state, userId);
    if (playerColor === null) {
      return err(GameServiceError.Unauthorized);
    }

    if (state.activePlayer !== playerColor) {
      return err(GameServiceError.IllegalMove);
    }

    const moveResult = performMove(state.board, {
      location,
      playerColor,
    });
    if (moveResult.isErr()) {
      return err(GameServiceError.IllegalMove);
    }

    const board = moveResult.value;
    const opponentColor = getOpponentColor(playerColor);
    const clockMsRemaining = this.getClockMsRemaining(state, playerColor);

    this.tasks.cancelClock({ gameId });

    const recordResult = await this.repository.recordAction({
      gameId,
      board,
      action: { kind: 'move', playerColor, location, clockMsRemaining },
    });
    if (recordResult.isErr()) {
      return err(this.mapRepositoryError(recordResult.error));
    }

    const opponentMoves = getValidMoveLocations(
      board,
      opponentColor,
    );

    if (opponentMoves.length === 0) {
      const ownMoves = getValidMoveLocations(board, playerColor);

      if (ownMoves.length === 0) {
        const completeResult = await this.completeGame(gameId, board);
        if (completeResult.isErr()) {
          return err(completeResult.error);
        }
      } else {
        const passResult = await this.repository.recordAction({
          gameId,
          board,
          action: { kind: 'pass', playerColor: opponentColor },
        });
        if (passResult.isErr()) {
          return err(this.mapRepositoryError(passResult.error));
        }

        // Opponent had no legal moves, so the turn stays with the mover -
        // their own reserve (already spent thinking on this move) keeps counting.
        this.tasks.scheduleClock({
          gameId,
          userId,
          expiresAt: new Date(Date.now() + clockMsRemaining),
        });
      }
    } else {
      const opponentId = this.getUserId(state, opponentColor);
      const opponentClockMsRemaining = this.getClockMsRemaining(
        state,
        opponentColor,
      );

      this.tasks.scheduleClock({
        gameId,
        userId: opponentId,
        expiresAt: new Date(Date.now() + opponentClockMsRemaining),
      });
    }

    return this.getState({ gameId });
  }

  async resign(args: {
    gameId: GameID;
    userId: UserID;
  }): Promise<Result<GameState, GameServiceError>> {
    const { gameId, userId } = args;

    const stateResult = await this.getState({ gameId });
    if (stateResult.isErr()) {
      return err(stateResult.error);
    }

    const state = stateResult.value;
    if (state.status !== 'active') {
      return err(GameServiceError.IllegalMove);
    }

    const playerColor = this.getPlayerColor(state, userId);
    if (playerColor === null) {
      return err(GameServiceError.Unauthorized);
    }

    const result = playerColor === 'w' ? 'black_win' : 'white_win';

    const updateResult = await this.repository.updateGame(gameId, {
      status: 'finished',
      result,
      endReason: 'resignation',
      endedAt: new Date(),
    });
    if (updateResult.isErr()) {
      return err(this.mapRepositoryError(updateResult.error));
    }

    this.tasks.cancelClock({ gameId });

    return this.getState({ gameId });
  }

  async sendMessage(args: {
    gameId: GameID;
    userId: UserID;
    content: GameMessageContent;
  }): Promise<Result<GameState, GameServiceError>> {
    const { gameId, userId, content } = args;

    const stateResult = await this.getState({ gameId });
    if (stateResult.isErr()) {
      return err(stateResult.error);
    }

    const playerColor = this.getPlayerColor(stateResult.value, userId);
    if (playerColor === null) {
      return err(GameServiceError.Unauthorized);
    }

    const recordResult = await this.repository.recordMessage({
      gameId,
      userId,
      message: content,
    });
    if (recordResult.isErr()) {
      return err(this.mapRepositoryError(recordResult.error));
    }

    return this.getState({ gameId });
  }

  private async completeGame(
    gameId: GameID,
    board: Board,
  ): Promise<Result<void, GameServiceError>> {
    const score = getGameScore(board);
    const result =
      score.white > score.black
        ? 'white_win'
        : score.black > score.white
          ? 'black_win'
          : 'draw';

    const updateResult = await this.repository.updateGame(gameId, {
      status: 'finished',
      result,
      endReason: 'normal',
      endedAt: new Date(),
    });
    if (updateResult.isErr()) {
      return err(this.mapRepositoryError(updateResult.error));
    }

    this.tasks.cancelClock({ gameId });

    return ok();
  }

  private async handleClockExpired(args: {
    gameId: GameID;
    userId: UserID;
  }): Promise<void> {
    const { gameId, userId } = args;

    const stateResult = await this.getState({ gameId });
    if (stateResult.isErr()) {
      return;
    }

    const state = stateResult.value;
    if (state.status !== 'active') {
      return;
    }

    const playerColor = this.getPlayerColor(state, userId);
    if (playerColor === null || state.activePlayer !== playerColor) {
      // Stale timer, already superseded by a move, resign, or an earlier expiry.
      return;
    }

    const result = playerColor === 'w' ? 'black_win' : 'white_win';

    const updateResult = await this.repository.updateGame(gameId, {
      status: 'finished',
      result,
      endReason: 'timeout',
      endedAt: new Date(),
    });
    if (updateResult.isErr()) {
      this.logger.error(updateResult.error);
      return;
    }

    this._gameChanged$.next(gameId);
  }

  private getUserId(state: GameState, playerColor: PlayerColor): UserID {
    return playerColor === 'w' ? state.white.id : state.black.id;
  }

  private getPlayerColor(state: GameState, userId: UserID): PlayerColor | null {
    if (userId === state.white.id) {
      return 'w';
    }

    if (userId === state.black.id) {
      return 'b';
    }

    return null;
  }

  private getClockMsRemaining(state: GameState, playerColor: PlayerColor): number {
    const member = playerColor === 'w' ? state.white : state.black;

    return member.clock.kind === 'active'
      ? Math.max(0, member.clock.expiresAt.getTime() - Date.now())
      : member.clock.clockTimeMilliseconds;
  }

  private mapRepositoryError(error: GameRepositoryError): GameServiceError {
    switch (error) {
      case GameRepositoryError.NotFound:
        return GameServiceError.NotFound;
      case GameRepositoryError.UnknownError:
        return GameServiceError.UnknownError;
    }
  }
}
