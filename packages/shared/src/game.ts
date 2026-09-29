import { z } from 'zod';
import { BitboardCodec } from './game-board.ts';
import { GamePlayerSchema } from './game-player.ts';
import { GameTimeControlSchema } from './game-time-control.ts';
import { GameIDSchema } from './identifiers.ts';

export const GameResultSchema = z.enum(['white_win', 'black_win', 'draw']);
export type GameResult = z.infer<typeof GameResultSchema>;

export const GameEndReasonSchema = z.enum(['normal', 'resignation', 'timeout']);
export type GameEndReason = z.infer<typeof GameEndReasonSchema>;

export const GameSchema = z.object({
  id: GameIDSchema,
  timeControl: GameTimeControlSchema,
  white: GamePlayerSchema,
  black: GamePlayerSchema,
  isRated: z.boolean(),
  createdAt: z.coerce.date(),
  startedAt: z.coerce.date().nullable(),
  endedAt: z.coerce.date().nullable(),
  result: GameResultSchema.nullable(),
  endReason: GameEndReasonSchema.nullable(),
  finalWhitePieces: BitboardCodec.nullable(),
  finalBlackPieces: BitboardCodec.nullable(),
});
export type Game = z.infer<typeof GameSchema>;

export function hasStarted(game: Game): boolean {
  return game.startedAt !== null;
}

export function hasEnded(game: Game): boolean {
  return game.endedAt !== null;
}
