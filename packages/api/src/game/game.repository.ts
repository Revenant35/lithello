import { Inject, Injectable } from '@nestjs/common';
import { asc, desc, eq, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type {
  Game,
  GameBoard,
  GameEndReason,
  GameID,
  GameMessage,
  GameMessageContent,
  GameMove,
  GameResult,
  GameTimeControl,
  GameTimeControlID,
  Player,
  Square,
  UserID,
} from '@lithello/shared';
import { type Database, DRIZZLE } from '../database/drizzle.provider.ts';
import type { GameRowUpdate } from '../database/database.type.ts';
import {
  game,
  gameMessage,
  gameMove,
  gameTimeControl,
  user,
} from '../database/schema/index.ts';
import {
  toGame,
  toGameMessage,
  toGameMove,
  toGameTimeControl,
} from './game.mapper.ts';

// A game references `user` twice, so each seat needs its own alias to be
// joined in the same query.
const whiteUser = alias(user, 'white_user');
const blackUser = alias(user, 'black_user');

/**
 * CRUD over the game tables. Deliberately thin: no rules, no clock arithmetic,
 * no session assembly - callers own all of that and hand this finished values.
 */
@Injectable()
export class GameRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async getGame(args: { id: GameID }): Promise<Game | null> {
    const [row] = await this.db
      .select()
      .from(game)
      .innerJoin(gameTimeControl, eq(game.timeControlId, gameTimeControl.id))
      .innerJoin(whiteUser, eq(game.whiteUserId, whiteUser.id))
      .innerJoin(blackUser, eq(game.blackUserId, blackUser.id))
      .where(eq(game.id, args.id))
      .limit(1);

    if (row === undefined) {
      return null;
    }

    return toGame(
      row.game,
      row.game_time_control,
      row.white_user,
      row.black_user,
    );
  }

  /** Games the user played either side of, newest first. */
  async getGames(args: {
    userId: UserID;
    limit?: number;
    offset?: number;
  }): Promise<Game[]> {
    const { userId, limit = 20, offset = 0 } = args;

    const rows = await this.db
      .select()
      .from(game)
      .innerJoin(gameTimeControl, eq(game.timeControlId, gameTimeControl.id))
      .innerJoin(whiteUser, eq(game.whiteUserId, whiteUser.id))
      .innerJoin(blackUser, eq(game.blackUserId, blackUser.id))
      .where(or(eq(game.whiteUserId, userId), eq(game.blackUserId, userId)))
      .orderBy(desc(game.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map((row) =>
      toGame(row.game, row.game_time_control, row.white_user, row.black_user),
    );
  }

  async getGameMoves(args: { gameId: GameID }): Promise<GameMove[]> {
    const rows = await this.db
      .select()
      .from(gameMove)
      .where(eq(gameMove.gameId, args.gameId))
      .orderBy(asc(gameMove.ply));

    return rows.map(toGameMove);
  }

  async getGameMessages(args: { gameId: GameID }): Promise<GameMessage[]> {
    const rows = await this.db
      .select()
      .from(gameMessage)
      .where(eq(gameMessage.gameId, args.gameId))
      .orderBy(asc(gameMessage.createdAt));

    return rows.map(toGameMessage);
  }

  async getTimeControl(args: {
    id: GameTimeControlID;
  }): Promise<GameTimeControl | null> {
    const [row] = await this.db
      .select()
      .from(gameTimeControl)
      .where(eq(gameTimeControl.id, args.id))
      .limit(1);

    return row === undefined ? null : toGameTimeControl(row);
  }

  /** Every configured time control. New ones are added directly in the database. */
  async getTimeControls(): Promise<GameTimeControl[]> {
    const rows = await this.db
      .select()
      .from(gameTimeControl)
      .orderBy(
        asc(gameTimeControl.startClockMs),
        asc(gameTimeControl.incrementMs),
      );

    return rows.map(toGameTimeControl);
  }

  /** Each side's `ratingBefore` is snapshotted from the player's current rating. */
  async createGame(args: {
    white: Player;
    black: Player;
    timeControlId: GameTimeControl['id'];
    isRated: boolean;
    startedAt?: Date;
  }): Promise<GameID> {
    const { white, black, ...rest } = args;

    const [row] = await this.db
      .insert(game)
      .values({
        ...rest,
        whiteUserId: white.id,
        blackUserId: black.id,
        whiteRatingBefore: white.rating,
        blackRatingBefore: black.rating,
      })
      .returning({ id: game.id });

    if (row === undefined) {
      throw new Error('Insert returned no game');
    }

    return row.id as GameID;
  }

  /**
   * `ply` comes from the caller so the (gameId, ply) primary key doubles as
   * optimistic concurrency - two writers racing the same ply, one loses.
   */
  async insertMove(args: {
    gameId: GameID;
    ply: number;
    board: GameBoard;
    square: Square | null;
    whiteTimeMs: number;
    blackTimeMs: number;
    playedAt?: Date;
  }): Promise<void> {
    const { board, ...rest } = args;

    await this.db.insert(gameMove).values({
      ...rest,
      whitePieces: board.whitePieces,
      blackPieces: board.blackPieces,
    });
  }

  async insertMessage(args: {
    gameId: GameID;
    userId: UserID;
    content: GameMessageContent;
  }): Promise<void> {
    await this.db.insert(gameMessage).values(args);
  }

  async updateGame(args: { id: GameID; patch: GameRowUpdate }): Promise<void> {
    await this.db.update(game).set(args.patch).where(eq(game.id, args.id));
  }

  /**
   * Every outcome column is constrained to become non-null together with
   * `endedAt`, so they are set in one call rather than left to a partial patch.
   */
  async finishGame(args: {
    id: GameID;
    result: GameResult;
    endReason: GameEndReason;
    finalBoard: GameBoard;
    whiteRatingAfter: number;
    blackRatingAfter: number;
    endedAt?: Date;
  }): Promise<void> {
    const { id, finalBoard, endedAt = new Date(), ...rest } = args;

    await this.db
      .update(game)
      .set({
        ...rest,
        endedAt,
        finalWhitePieces: finalBoard.whitePieces,
        finalBlackPieces: finalBoard.blackPieces,
      })
      .where(eq(game.id, id));
  }
}
