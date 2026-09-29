import { Inject, Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import {
  type Game,
  type GameBoard,
  type GameEndReason,
  type GameID,
  type GameMessageContent,
  type GameResult,
  type GameSession,
  type GameTimeControl,
  type GameTimeControlID,
  applyMove,
  getColorForPly,
  getCurrentBoard,
  getGameClocks,
  getLastMove,
  getOpponentColor,
  getRatingsAfterGame,
  getTurnDeadline,
  getWinner,
  hasLegalMove,
  INITIAL_BOARD,
  isLegalMove,
  type Player,
  type PlayerColor,
  type Square,
  type UserID,
} from '@lithello/shared';
import {
  GameAlreadyEndedError,
  GameNotFoundError,
  IllegalMoveError,
  InvalidGameError,
  NotAParticipantError,
  NotYourTurnError,
  PlayerNotFoundError,
  TimeControlNotFoundError,
} from './game.error.ts';
import { REDIS_CLIENT } from '../redis/redis-client.provider.ts';
import type { AppRedisClient } from '../redis/app-redis-client.type.ts';
import { GameRepository } from './game.repository.ts';
import { PlayerRepository } from '../player/player.repository.ts';

/** Deadlines of every in-progress game, scored by when the mover runs out. */
const GAME_DEADLINES = 'game-deadlines';

/** How long a sweeping process holds a claimed deadline before it is retried. */
const CLAIM_LEASE_MS = 10_000;

const CLAIM_BATCH_SIZE = 100;

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  private readonly _gameSessionChanged$ = new Subject<GameSession>();
  public readonly gameSessionChanged$ = this._gameSessionChanged$.asObservable();

  constructor(
    private readonly games: GameRepository,
    private readonly players: PlayerRepository,
    @Inject(REDIS_CLIENT) private readonly redis: AppRedisClient,
  ) {}

  async getSession(args: { gameId: GameID }): Promise<GameSession> {
    const game = await this.games.getGame({ id: args.gameId });

    if (game === null) {
      throw new GameNotFoundError();
    }

    // Both seats arrive on the game itself, names included, so a session is
    // the game plus its history.
    const [moves, messages] = await Promise.all([
      this.games.getGameMoves({ gameId: game.id }),
      this.games.getGameMessages({ gameId: game.id }),
    ]);

    return { game, moves, messages };
  }

  async getGames(args: {
    userId: UserID;
    limit?: number;
    offset?: number;
  }): Promise<Game[]> {
    return this.games.getGames(args);
  }

  /** Every configured time control, for callers choosing one before createGame. */
  async getTimeControls(): Promise<GameTimeControl[]> {
    return this.games.getTimeControls();
  }

  /**
   * Seats both players and writes ply 0 - the initial position, with no square
   * played. Every later move reads its clock origin from the previous ply, so
   * that row is what gives black's first move something to count from.
   */
  async createGame(args: {
    whiteUserId: UserID;
    blackUserId: UserID;
    timeControlId: GameTimeControlID;
    isRated: boolean;
  }): Promise<GameSession> {
    const { whiteUserId, blackUserId, timeControlId, isRated } = args;

    if (whiteUserId === blackUserId) {
      throw new InvalidGameError('A game needs two different players');
    }

    const [white, black, timeControl] = await Promise.all([
      this.getPlayer(whiteUserId),
      this.getPlayer(blackUserId),
      this.getTimeControl(timeControlId)
    ]);

    const startedAt = new Date();

    const gameId = await this.games.createGame({
      white,
      black,
      timeControlId,
      isRated,
      startedAt,
    });

    await this.games.insertMove({
      gameId,
      ply: 0,
      board: INITIAL_BOARD,
      square: null,
      whiteTimeMs: timeControl.startClockMs,
      blackTimeMs: timeControl.startClockMs,
      playedAt: startedAt,
    });

    return this.publishSession({ gameId });
  }

  async move(args: {
    gameId: GameID;
    userId: UserID;
    square: Square;
  }): Promise<GameSession> {
    const { gameId, userId, square } = args;

    const session = await this.getSession({ gameId });
    const color = this.requireActiveParticipant(session, userId);

    const lastMove = getLastMove(session.moves);

    if (lastMove === null) {
      throw new InvalidGameError('Game has no initial position');
    }

    const ply = lastMove.ply + 1;

    if (getColorForPly(ply) !== color) {
      throw new NotYourTurnError();
    }

    const board = getCurrentBoard(session.moves);

    if (!isLegalMove(board, color, square)) {
      throw new IllegalMoveError();
    }

    const playedAt = new Date();
    const clocks = this.getClocksAfterTurn(session, color, lastMove.playedAt, playedAt);

    if (clocks[color === 'w' ? 'white' : 'black'] <= 0) {
      await this.endGame({
        session,
        result: color === 'w' ? 'black_win' : 'white_win',
        endReason: 'timeout',
        finalBoard: board,
      });

      return this.publishSession({ gameId });
    }

    const nextBoard = applyMove(board, color, square);

    await this.games.insertMove({
      gameId,
      ply,
      board: nextBoard,
      square,
      whiteTimeMs: clocks.white,
      blackTimeMs: clocks.black,
      playedAt,
    });

    await this.settleTurn({ session, board: nextBoard, mover: color, ply, clocks, playedAt });

    return this.publishSession({ gameId });
  }

  async resign(args: { gameId: GameID; userId: UserID }): Promise<GameSession> {
    const { gameId, userId } = args;

    const session = await this.getSession({ gameId });
    const color = this.requireActiveParticipant(session, userId);

    await this.endGame({
      session,
      result: color === 'w' ? 'black_win' : 'white_win',
      endReason: 'resignation',
      finalBoard: getCurrentBoard(session.moves),
    });

    return this.publishSession({ gameId });
  }

  async sendMessage(args: {
    gameId: GameID;
    userId: UserID;
    content: GameMessageContent;
  }): Promise<GameSession> {
    const { gameId, userId, content } = args;

    const session = await this.getSession({ gameId });

    if (this.getColor(session, userId) === null) {
      throw new NotAParticipantError();
    }

    await this.games.insertMessage({ gameId, userId, content });

    return this.publishSession({ gameId });
  }

  /**
   * After a move lands, the turn either passes to the opponent, bounces back
   * because they have nothing legal, or the game is over because neither side
   * does. A pass is recorded as its own ply with an unchanged board.
   */
  private async settleTurn(args: {
    session: GameSession;
    board: GameBoard;
    mover: PlayerColor;
    ply: number;
    clocks: { white: number; black: number };
    playedAt: Date;
  }): Promise<void> {
    const { session, board, mover, ply, clocks, playedAt } = args;
    const opponent = getOpponentColor(mover);

    if (hasLegalMove(board, opponent)) {
      return;
    }

    if (!hasLegalMove(board, mover)) {
      await this.endGame({
        session,
        result: getWinner(board),
        endReason: 'normal',
        finalBoard: board,
      });
      return;
    }

    await this.games.insertMove({
      gameId: session.game.id,
      ply: ply + 1,
      board,
      square: null,
      whiteTimeMs: clocks.white,
      blackTimeMs: clocks.black,
      playedAt,
    });
  }

  /**
   * Settles the game and, when it was rated, both players' ratings.
   *
   * An unrated game still writes the after-ratings - they are constrained to
   * become non-null together with endedAt - but leaves them where they were.
   */
  private async endGame(args: {
    session: GameSession;
    result: GameResult;
    endReason: GameEndReason;
    finalBoard: GameBoard;
  }): Promise<void> {
    const { session, result, endReason, finalBoard } = args;
    const { white, black, isRated } = session.game;

    const ratings = isRated
      ? getRatingsAfterGame({
          whiteRating: white.ratingBefore,
          blackRating: black.ratingBefore,
          result,
        })
      : { white: white.ratingBefore, black: black.ratingBefore };

    await this.games.finishGame({
      id: session.game.id,
      result,
      endReason,
      finalBoard,
      whiteRatingAfter: ratings.white,
      blackRatingAfter: ratings.black,
    });

    if (!isRated) {
      return;
    }

    await Promise.all([
      this.players.updateRating({ userId: white.id, rating: ratings.white }),
      this.players.updateRating({ userId: black.id, rating: ratings.black }),
    ]);
  }

  /**
   * The mover has been on the clock since the previous ply; the idle side's
   * clock is untouched. Stored values are post-increment.
   */
  private getClocksAfterTurn(
    session: GameSession,
    mover: PlayerColor,
    turnStartedAt: Date,
    playedAt: Date,
  ): { white: number; black: number } {
    const clocks = getGameClocks(session.moves, session.game.timeControl);
    const elapsed = playedAt.getTime() - turnStartedAt.getTime();
    const { incrementMs } = session.game.timeControl;

    const key = mover === 'w' ? 'white' : 'black';

    return { ...clocks, [key]: clocks[key] - elapsed + incrementMs };
  }

  private requireActiveParticipant(
    session: GameSession,
    userId: UserID,
  ): PlayerColor {
    if (session.game.endedAt !== null) {
      throw new GameAlreadyEndedError();
    }

    const color = this.getColor(session, userId);

    if (color === null) {
      throw new NotAParticipantError();
    }

    return color;
  }

  private getColor(session: GameSession, userId: UserID): PlayerColor | null {
    if (session.game.white.id === userId) {
      return 'w';
    }

    if (session.game.black.id === userId) {
      return 'b';
    }

    return null;
  }

  private async getPlayer(userId: UserID): Promise<Player> {
    const player = await this.players.getPlayer({ id: userId });

    if (player === null) {
      throw new PlayerNotFoundError(`No player record for user ${userId}`);
    }

    return player;
  }

  private async getTimeControl(id: GameTimeControlID): Promise<GameTimeControl> {
    const timeControl = await this.games.getTimeControl({ id });

    if (timeControl === null) {
      throw new TimeControlNotFoundError();
    }

    return timeControl;
  }

  private async publishSession(args: { gameId: GameID }): Promise<GameSession> {
    const session = await this.getSession(args);

    await this.syncClockDeadline(session);
    this._gameSessionChanged$.next(session);

    return session;
  }

  /**
   * Records when this game's clock next runs out, or drops it once the game is
   * over. Kept in Redis rather than a process timer so deadlines survive a
   * restart and any instance can act on them.
   */
  private async syncClockDeadline(session: GameSession): Promise<void> {
    const gameId = session.game.id;
    const deadline = getTurnDeadline(session);

    if (deadline === null) {
      await this.redis.zRem(GAME_DEADLINES, gameId);
      return;
    }

    await this.redis.zAdd(GAME_DEADLINES, {
      score: deadline.expiresAt.getTime(),
      value: gameId,
    });
  }

  /**
   * Claims every deadline that has come due and ends those games on time. The
   * claim is atomic, so with several instances running exactly one handles a
   * given game.
   *
   * Driven by GameTasks on a cron; safe to call directly in a test.
   */
  async sweepExpiredClocks(): Promise<void> {
    const now = Date.now();

    const due = await this.redis.claimDueDeadlines(
      GAME_DEADLINES,
      now,
      now + CLAIM_LEASE_MS,
      CLAIM_BATCH_SIZE,
    );

    for (const gameId of due) {
      await this.handleClockExpiry(gameId as GameID);
    }
  }

  /**
   * Re-reads the game before acting: a move landing just before the sweep moves
   * the deadline on, and the claim would otherwise end a game still in play.
   */
  private async handleClockExpiry(gameId: GameID): Promise<void> {
    try {
      const session = await this.getSession({ gameId });
      const deadline = getTurnDeadline(session);

      if (deadline === null || deadline.expiresAt.getTime() > Date.now()) {
        // Ended, or the clock has moved on - rewrite the score and leave it.
        await this.syncClockDeadline(session);
        return;
      }

      await this.endGame({
        session,
        result: deadline.color === 'w' ? 'black_win' : 'white_win',
        endReason: 'timeout',
        finalBoard: getCurrentBoard(session.moves),
      });

      await this.publishSession({ gameId });
    } catch (error) {
      // The lease expires on its own, so a failure here is retried.
      this.logger.error(error);
    }
  }
}
