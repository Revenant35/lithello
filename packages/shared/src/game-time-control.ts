import { z } from 'zod';
import { type GameMove, getLastMove } from './game-move.ts';
import { GameTimeControlIDSchema } from './identifiers.ts';

export const GameTimeControlSchema = z.object({
  id: GameTimeControlIDSchema,
  startClockMs: z.int().positive(),
  incrementMs: z.int().nonnegative(),
});
export type GameTimeControl = z.infer<typeof GameTimeControlSchema>;

/** Renders a time control in the conventional "5+0" notation (minutes+seconds). */
export function formatTimeControl(timeControl: GameTimeControl): string {
  const minutes = timeControl.startClockMs / 60_000;
  const incrementSeconds = timeControl.incrementMs / 1_000;
  return `${formatNumber(minutes)}+${formatNumber(incrementSeconds)}`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Remaining time for each side as of the most recent move, falling back to the
 * time control before either side has moved. Stored values are post-increment,
 * so these are the real clocks with nothing left to add.
 *
 * The moving side's clock has been running since that move's `playedAt`, so a
 * live countdown subtracts `now - playedAt` from whichever side is to move.
 */
export function getGameClocks(
  moves: GameMove[],
  timeControl: GameTimeControl,
): { white: number; black: number } {
  const lastMove = getLastMove(moves);

  if (lastMove === null) {
    return { white: timeControl.startClockMs, black: timeControl.startClockMs };
  }

  return { white: lastMove.whiteTimeMs, black: lastMove.blackTimeMs };
}
