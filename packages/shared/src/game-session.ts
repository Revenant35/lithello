import { z } from 'zod';
import { getColorForPly, GameSchema } from './game.ts';
import { GameMessageSchema } from './game-message.ts';
import { GameMoveSchema, getLastMove } from './game-move.ts';
import type { PlayerColor } from './game-player.ts';
import { getGameClocks } from './game-time-control.ts';

/**
 * Everything a client needs to render a game. Both players travel on
 * `game.white` and `game.black`, which carry their name and the ratings this
 * game moved them between.
 *
 * The current position and the clocks are both derived rather than carried:
 * `getCurrentBoard(moves)` returns the last move's board (or the opening
 * position when there are none), and `getGameClocks(moves, game.timeControl)`
 * reads the post-increment clocks off that same move. Sending either alongside
 * `moves` would be a second source of truth that can disagree with it.
 */
export const GameSessionSchema = z.object({
  game: GameSchema,
  moves: z.array(GameMoveSchema),
  messages: z.array(GameMessageSchema),
  whiteConnected: z.boolean(),
  blackConnected: z.boolean(),
  // When a disconnected player forfeits, so the client can count down. Null
  // while they are connected, or once the game has ended.
  whiteAbandonsAt: z.coerce.date().nullable(),
  blackAbandonsAt: z.coerce.date().nullable(),
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

/** Whether a side is connected, and when they forfeit if they are not. */
export function getConnectionState(
  session: GameSession,
  color: PlayerColor,
): { isConnected: boolean; abandonsAt: Date | null } {
  return color === 'w'
    ? {
        isConnected: session.whiteConnected,
        abandonsAt: session.whiteAbandonsAt,
      }
    : {
        isConnected: session.blackConnected,
        abandonsAt: session.blackAbandonsAt,
      };
}

/**
 * Clocks as they should be shown.
 *
 * While the game is live these are the stored values, and the side to move
 * counts down against `getTurnDeadline`. Once it has ended there is no further
 * move to record the time against, so the side that was on the clock is charged
 * for the gap between their last move and the end - otherwise the display jumps
 * back to what they had before the turn they never finished.
 */
export function getDisplayClocks(session: GameSession): {
  white: number;
  black: number;
} {
  const clocks = getGameClocks(session.moves, session.game.timeControl);
  const { endedAt } = session.game;
  const lastMove = getLastMove(session.moves);

  if (endedAt === null || lastMove === null) {
    return clocks;
  }

  const mover = getColorForPly(lastMove.ply + 1);
  const key = mover === 'w' ? 'white' : 'black';
  const elapsed = endedAt.getTime() - lastMove.playedAt.getTime();

  return { ...clocks, [key]: Math.max(0, clocks[key] - elapsed) };
}
