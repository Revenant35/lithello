import { z } from 'zod';
import {
  type GameBoard,
  GameBoardSchema,
  INITIAL_BOARD,
  SquareSchema,
} from './game-board.ts';
import { GameIDSchema } from './identifiers.ts';

export const GameMoveSchema = z.object({
  gameId: GameIDSchema,
  ply: z.int().nonnegative(),
  board: GameBoardSchema,
  /** The tile played, or null for a pass. */
  square: SquareSchema.nullable(),
  whiteTimeMs: z.int().nonnegative(),
  blackTimeMs: z.int().nonnegative(),
  playedAt: z.coerce.date(),
});
export type GameMove = z.infer<typeof GameMoveSchema>;

/** The move with the highest ply, or null if none have been played. */
export function getLastMove(moves: GameMove[]): GameMove | null {
  return moves.reduce<GameMove | null>(
    (latest, move) =>
      latest === null || move.ply > latest.ply ? move : latest,
    null,
  );
}

/** The position after the last move, or the opening position if there are none. */
export function getCurrentBoard(moves: GameMove[]): GameBoard {
  return getLastMove(moves)?.board ?? INITIAL_BOARD;
}
