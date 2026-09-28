import { Inject, Injectable, Logger } from '@nestjs/common';
import { Database, GameRowUpdate } from '../database/database.type.ts';
import { Kysely, NoResultError } from 'kysely';
import { randomUUID } from 'node:crypto';
import {
  GameID,
  GameState,
  GameAction,
  GameMember,
  GameMessage,
  GameSummary,
  Board,
  BOARD_SIZE,
  PlayerColor,
  UserID,
  GameMessageContent,
} from '@lithello/shared';
import { KYSELY } from '../database/kysely.provider.ts';
import { OthelloService } from './othello.service.ts';
import { err, ok, Result } from 'neverthrow';

export enum GameRepositoryError {
  NotFound = 'Not Found',
  UnknownError = 'Unknown Error',
}

@Injectable()
export class GameRepository {
  private readonly logger = new Logger(GameRepository.name);

  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    private readonly othello: OthelloService,
  ) {}

  async createGame(args: {
    whiteId: UserID;
    blackId: UserID;
    startClockMs: number;
  }): Promise<Result<{ gameId: GameID; state: GameState }, GameRepositoryError>> {
    const { whiteId, blackId, startClockMs } = args;
    const id = randomUUID() as GameID;

    try {
      await this.db
        .insertInto('game')
        .values({ id, whiteId, blackId, startClockMs })
        .execute();

      const row = await this.db
        .selectFrom('game')
        .innerJoin('user as whiteUser', 'whiteUser.id', 'game.whiteId')
        .innerJoin('user as blackUser', 'blackUser.id', 'game.blackId')
        .select([
          'game.board as board',
          'game.startedAt as startedAt',
          'whiteUser.id as whiteId',
          'whiteUser.name as whiteName',
          'blackUser.id as blackId',
          'blackUser.name as blackName',
        ])
        .where('game.id', '=', id)
        .executeTakeFirstOrThrow();

      const board = this.decodeBoard(row.board);
      const white = this.buildIdleMember(
        row.whiteId as UserID,
        row.whiteName,
        startClockMs,
      );
      const black = this.buildActiveMember(
        row.blackId as UserID,
        row.blackName,
        startClockMs,
        row.startedAt,
      );

      const game: GameState = {
        white,
        black,
        board,
        score: this.othello.getGameScore(board),
        messages: [],
        moveHistory: [],
        status: 'active',
        activePlayer: 'b',
        possibleMoves: this.othello.getValidMoveLocations(board, 'b'),
      };

      return ok({ gameId: id, state: game });
    } catch (error) {
      this.logger.error(error);
      return err(GameRepositoryError.UnknownError);
    }
  }

  async getGame(args: {
    gameId: GameID;
  }): Promise<Result<GameState, GameRepositoryError>> {
    const { gameId } = args;

    try {
      const row = await this.db
        .selectFrom('game')
        .innerJoin('user as whiteUser', 'whiteUser.id', 'game.whiteId')
        .innerJoin('user as blackUser', 'blackUser.id', 'game.blackId')
        .select([
          'game.startClockMs as startClockMs',
          'game.board as board',
          'game.status as status',
          'game.result as result',
          'game.endReason as endReason',
          'game.startedAt as startedAt',
          'game.endedAt as endedAt',
          'whiteUser.id as whiteId',
          'whiteUser.name as whiteName',
          'blackUser.id as blackId',
          'blackUser.name as blackName',
        ])
        .where('game.id', '=', gameId)
        .executeTakeFirstOrThrow();

      const actionRows = await this.db
        .selectFrom('gameAction')
        .selectAll()
        .where('gameId', '=', gameId)
        .orderBy('actionNumber', 'asc')
        .execute();

      const messageRows = await this.db
        .selectFrom('gameMessage')
        .innerJoin('user', 'user.id', 'gameMessage.userId')
        .select([
          'gameMessage.content as content',
          'gameMessage.createdAt as createdAt',
          'user.id as userId',
          'user.name as userName',
        ])
        .where('gameMessage.gameId', '=', gameId)
        .orderBy('gameMessage.createdAt', 'asc')
        .execute();

      const board = this.decodeBoard(row.board);

      const moveHistory: GameAction[] = actionRows.map((action) => {
        const playerColor: PlayerColor =
          action.userId === row.whiteId ? 'w' : 'b';

        if (action.kind === 'pass') {
          return { kind: 'pass', playerColor };
        }

        return {
          kind: 'move',
          playerColor,
          location: { row: action.row!, col: action.col! },
          clockMsRemaining: action.clockMsRemaining!,
        };
      });

      const messages: GameMessage[] = messageRows.map((message) => ({
        user: { id: message.userId as UserID, name: message.userName },
        content: message.content,
        createdAt: message.createdAt,
      }));

      let activePlayer: PlayerColor = 'b';
      for (let i = 0; i < actionRows.length; i++) {
        activePlayer = this.othello.getOpponentColor(activePlayer);
      }

      const isActive = row.status === 'active';

      // The active player's countdown began the instant the turn passed to them
      // (the last recorded action, or game start if nobody has moved yet) - not
      // "now", or every unrelated state refresh (a chat message, a reconnect)
      // would push their deadline forward.
      const turnStartedAt =
        actionRows.length > 0
          ? actionRows[actionRows.length - 1]!.createdAt
          : row.startedAt;

      let whiteClockMs = this.getRemainingClockMs(
        actionRows,
        row.whiteId,
        row.startClockMs,
      );
      let blackClockMs = this.getRemainingClockMs(
        actionRows,
        row.blackId,
        row.startClockMs,
      );

      // The game can end mid-turn (timeout, resignation) with no action ever
      // recorded for that turn, so the active player's baseline above is still
      // their remaining time from *before* the turn started. Burn off however
      // long the turn actually lasted so their final clock reflects reality
      // instead of jumping back up to what they had at the start of the turn.
      if (row.status === 'finished' && row.endedAt !== null) {
        const elapsed = row.endedAt.getTime() - turnStartedAt.getTime();

        if (activePlayer === 'w') {
          whiteClockMs = Math.max(0, whiteClockMs - elapsed);
        } else {
          blackClockMs = Math.max(0, blackClockMs - elapsed);
        }
      }

      const white =
        isActive && activePlayer === 'w'
          ? this.buildActiveMember(
              row.whiteId as UserID,
              row.whiteName,
              whiteClockMs,
              turnStartedAt,
            )
          : this.buildIdleMember(row.whiteId as UserID, row.whiteName, whiteClockMs);

      const black =
        isActive && activePlayer === 'b'
          ? this.buildActiveMember(
              row.blackId as UserID,
              row.blackName,
              blackClockMs,
              turnStartedAt,
            )
          : this.buildIdleMember(row.blackId as UserID, row.blackName, blackClockMs);

      if (row.status === 'finished') {
        if (
          row.result === null ||
          row.endReason === null ||
          row.endedAt === null
        ) {
          return err(GameRepositoryError.UnknownError);
        }

        return ok({
          white,
          black,
          board,
          score: this.othello.getGameScore(board),
          messages,
          moveHistory,
          status: 'finished',
          result: row.result,
          endReason: row.endReason,
          endedAt: row.endedAt,
        });
      }

      return ok({
        white,
        black,
        board,
        score: this.othello.getGameScore(board),
        messages,
        moveHistory,
        status: 'active',
        activePlayer,
        possibleMoves: this.othello.getValidMoveLocations(board, activePlayer),
      });
    } catch (error) {
      return err(this.handleError(error));
    }
  }

  async listFinishedGames(args: {
    userId: UserID;
    limit: number;
  }): Promise<Result<GameSummary[], GameRepositoryError>> {
    const { userId, limit } = args;

    try {
      const rows = await this.db
        .selectFrom('game')
        .innerJoin('user as whiteUser', 'whiteUser.id', 'game.whiteId')
        .innerJoin('user as blackUser', 'blackUser.id', 'game.blackId')
        .select([
          'game.id as id',
          'game.result as result',
          'game.endedAt as endedAt',
          'whiteUser.id as whiteId',
          'whiteUser.name as whiteName',
          'blackUser.id as blackId',
          'blackUser.name as blackName',
        ])
        .where('game.status', '=', 'finished')
        .where((eb) =>
          eb.or([eb('game.whiteId', '=', userId), eb('game.blackId', '=', userId)]),
        )
        .orderBy('game.endedAt', 'desc')
        .limit(limit)
        .execute();

      const summaries: GameSummary[] = rows.map((row) => {
        const viewerColor: PlayerColor = row.whiteId === userId ? 'w' : 'b';
        const opponent =
          viewerColor === 'w'
            ? { id: row.blackId as UserID, name: row.blackName }
            : { id: row.whiteId as UserID, name: row.whiteName };

        return {
          id: row.id as GameID,
          opponent,
          viewerColor,
          result: row.result!,
          endedAt: row.endedAt!,
        };
      });

      return ok(summaries);
    } catch (error) {
      return err(this.handleError(error));
    }
  }

  async updateGame(
    gameId: GameID,
    patch: GameRowUpdate,
  ): Promise<Result<void, GameRepositoryError>> {
    try {
      await this.db
        .updateTable('game')
        .set(patch)
        .where('id', '=', gameId)
        .execute();
      return ok();
    } catch (error) {
      return err(this.handleError(error));
    }
  }

  async recordAction(args: {
    gameId: GameID;
    board: Board;
    action: GameAction;
  }): Promise<Result<void, GameRepositoryError>> {
    const { gameId, board, action } = args;

    try {
      const game = await this.db
        .selectFrom('game')
        .select(['whiteId', 'blackId'])
        .where('id', '=', gameId)
        .executeTakeFirstOrThrow();

      const userId =
        action.playerColor === 'w'
          ? (game.whiteId as UserID)
          : (game.blackId as UserID);

      const { maxActionNumber } = await this.db
        .selectFrom('gameAction')
        .select((eb) => eb.fn.max('actionNumber').as('maxActionNumber'))
        .where('gameId', '=', gameId)
        .executeTakeFirstOrThrow();

      await this.db
        .insertInto('gameAction')
        .values({
          gameId,
          userId,
          actionNumber: (maxActionNumber ?? 0) + 1,
          kind: action.kind,
          clockMsRemaining:
            action.kind === 'move' ? action.clockMsRemaining : null,
          row: action.kind === 'move' ? action.location.row : null,
          col: action.kind === 'move' ? action.location.col : null,
        })
        .execute();

      await this.db
        .updateTable('game')
        .set({ board: this.encodeBoard(board) })
        .where('id', '=', gameId)
        .execute();

      return ok();
    } catch (error) {
      return err(this.handleError(error));
    }
  }

  async recordMessage(args: {
    gameId: GameID;
    userId: UserID;
    message: GameMessageContent;
  }): Promise<Result<void, GameRepositoryError>> {
    const { gameId, userId, message } = args;

    try {
      await this.db
        .insertInto('gameMessage')
        .values({ gameId, userId, content: message })
        .execute();

      return ok();
    } catch (error) {
      return err(this.handleError(error));
    }
  }

  private handleError(error: unknown): GameRepositoryError {
    if (error instanceof NoResultError) {
      return GameRepositoryError.NotFound;
    }

    this.logger.error(error);
    return GameRepositoryError.UnknownError;
  }

  private buildActiveMember(
    id: UserID,
    name: string,
    clockMsRemaining: number,
    turnStartedAt: Date,
  ): GameMember {
    return {
      id,
      name,
      clock: {
        kind: 'active',
        expiresAt: new Date(turnStartedAt.getTime() + clockMsRemaining),
      },
      isConnected: false,
    };
  }

  private buildIdleMember(
    id: UserID,
    name: string,
    clockMsRemaining: number,
  ): GameMember {
    return {
      id,
      name,
      clock: { kind: 'idle', clockTimeMilliseconds: clockMsRemaining },
      isConnected: false,
    };
  }

  private getRemainingClockMs(
    actionRows: { userId: string; kind: string; clockMsRemaining: number | null }[],
    userId: string,
    startClockMs: number,
  ): number {
    for (let i = actionRows.length - 1; i >= 0; i--) {
      const action = actionRows[i];
      if (
        action.userId === userId &&
        action.kind === 'move' &&
        action.clockMsRemaining !== null
      ) {
        return action.clockMsRemaining;
      }
    }

    return startClockMs;
  }

  private encodeBoard(board: Board): string {
    return board.map((row) => row.map((cell) => cell ?? '-').join('')).join('');
  }

  private decodeBoard(board: string): Board {
    const rows: Board = [];

    for (let row = 0; row < BOARD_SIZE; row++) {
      const start = row * BOARD_SIZE;
      const chars = board.slice(start, start + BOARD_SIZE).split('');

      rows.push(
        chars.map((char) => (char === '-' ? null : (char as PlayerColor))),
      );
    }

    return rows;
  }
}
