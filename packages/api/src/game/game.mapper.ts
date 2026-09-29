import {
  type Game,
  GameIDSchema,
  type GameMessage,
  GameMessageIDSchema,
  type GameMove,
  type GameTimeControl,
  GameTimeControlIDSchema,
  type PlayerColor,
  UserIDSchema,
} from '@lithello/shared';
import type {
  GameMessageRow,
  GameMoveRow,
  GameRow,
  GameTimeControlRow,
  UserRow,
} from '../database/database.type.ts';

/**
 * Row-to-domain mappers.
 *
 * These parse the identifiers and build the rest from the typed row rather than
 * running the whole object through its shared schema. Two reasons: drizzle's row
 * types already pin the mapper to the table at compile time, and the bitboard
 * fields sit behind a codec whose input side is a hex string - pushing a row
 * through it would mean encoding bigints to hex only to decode them straight
 * back. Branding is the one thing the compiler cannot check, so that is parsed.
 */

export function toGameTimeControl(row: GameTimeControlRow): GameTimeControl {
  return {
    id: GameTimeControlIDSchema.parse(row.id),
    startClockMs: row.startClockMs,
    incrementMs: row.incrementMs,
  };
}

export function toGameMessage(row: GameMessageRow): GameMessage {
  return {
    id: GameMessageIDSchema.parse(row.id),
    gameId: GameIDSchema.parse(row.gameId),
    userId: UserIDSchema.parse(row.userId),
    content: row.content,
    createdAt: row.createdAt,
  };
}

export function toGameMove(row: GameMoveRow): GameMove {
  return {
    gameId: GameIDSchema.parse(row.gameId),
    ply: row.ply,
    // The table stores the two bitboards flat; the domain nests them.
    board: {
      whitePieces: row.whitePieces,
      blackPieces: row.blackPieces,
    },
    square: row.square,
    whiteTimeMs: row.whiteTimeMs,
    blackTimeMs: row.blackTimeMs,
    playedAt: row.playedAt,
  };
}

/**
 * `game` holds both seats as paired columns, so each side is assembled here
 * from the game row and that side's user row. Colour is positional in the
 * table and explicit on the seat.
 */
function toGamePlayer(
  userRow: UserRow,
  color: PlayerColor,
  ratingBefore: number,
  ratingAfter: number | null,
): Game['white'] {
  return {
    id: UserIDSchema.parse(userRow.id),
    name: userRow.name,
    color,
    ratingBefore,
    ratingAfter,
  };
}

export function toGame(
  row: GameRow,
  timeControlRow: GameTimeControlRow,
  whiteUserRow: UserRow,
  blackUserRow: UserRow,
): Game {
  return {
    id: GameIDSchema.parse(row.id),
    timeControl: toGameTimeControl(timeControlRow),
    white: toGamePlayer(
      whiteUserRow,
      'w',
      row.whiteRatingBefore,
      row.whiteRatingAfter,
    ),
    black: toGamePlayer(
      blackUserRow,
      'b',
      row.blackRatingBefore,
      row.blackRatingAfter,
    ),
    isRated: row.isRated,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    result: row.result,
    endReason: row.endReason,
    finalWhitePieces: row.finalWhitePieces,
    finalBlackPieces: row.finalBlackPieces,
  };
}
