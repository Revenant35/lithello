import { z } from 'zod';
import { getColorForPly, GameSchema } from './game.ts';
import { GameMessageSchema } from './game-message.ts';
import { GameMoveSchema, getLastMove } from './game-move.ts';
import type { PlayerColor } from './game-player.ts';
import { getGameClocks } from './game-time-control.ts';
import { PlayerSchema } from './player.ts';

/**
 * Everything a client needs to render a game.
 *
 * The current position and the clocks are both derived rather than carried:
 * `getCurrentBoard(moves)` returns the last move's board (or the opening
 * position when there are none), and `getGameClocks(moves, game.timeControl)`
 * reads the post-increment clocks off that same move. Sending either alongside
 * `moves` would be a second source of truth that can disagree with it.
 */
export const GameSessionSchema = z.object({
  game: GameSchema,
  white: PlayerSchema,
  black: PlayerSchema,
  moves: z.array(GameMoveSchema),
  messages: z.array(GameMessageSchema),
});
export type GameSession = z.infer<typeof GameSessionSchema>;

/**
 * The session as it travels: bitboards as hex rather than bigint, dates as
 * strings. JSON cannot carry a bigint, so this is what actually goes over the
 * socket. Encode with `z.encode(GameSessionSchema, session)` and decode on the
 * far side with `z.decode`.
 */
export type GameSessionWire = z.input<typeof GameSessionSchema>;

/**
 * Who is on the clock and the instant they run out, or null once the game has
 * ended.
 *
 * The deadline is absolute - the previous ply's `playedAt` plus that side's
 * remaining time - so recomputing it never pushes it forward. Anything that
 * republishes the session (a chat message, a reconnect) leaves it unchanged.
 */
export function getTurnDeadline(
  session: GameSession,
): { color: PlayerColor; expiresAt: Date } | null {
  if (session.game.endedAt !== null) {
    return null;
  }

  const lastMove = getLastMove(session.moves);

  if (lastMove === null) {
    return null;
  }

  const color = getColorForPly(lastMove.ply + 1);
  const clocks = getGameClocks(session.moves, session.game.timeControl);
  const remaining = clocks[color === 'w' ? 'white' : 'black'];

  return {
    color,
    expiresAt: new Date(lastMove.playedAt.getTime() + remaining),
  };
}
