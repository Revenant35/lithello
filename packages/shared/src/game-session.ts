import { z } from 'zod';
import { GameSchema } from './game.ts';
import { GameMessageSchema } from './game-message.ts';
import { GameMoveSchema } from './game-move.ts';
import { UserSchema } from './user.ts';

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
  white: UserSchema,
  black: UserSchema,
  moves: z.array(GameMoveSchema),
  messages: z.array(GameMessageSchema),
});
export type GameSession = z.infer<typeof GameSessionSchema>;
