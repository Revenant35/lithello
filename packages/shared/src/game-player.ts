import { z } from 'zod';
import { GameIDSchema } from './identifiers.ts';
import { UserSchema } from './user.ts';

export const PlayerColorSchema = z.enum(['w', 'b']);
export type PlayerColor = z.infer<typeof PlayerColorSchema>;

/**
 * A user in one seat of one game, with the ratings that game moved them
 * between. Nested inside a Game the `gameId` is redundant, so GameSchema omits
 * it; it is here for the standalone shape.
 */
export const GamePlayerSchema = UserSchema.extend({
  gameId: GameIDSchema,
  color: PlayerColorSchema,
  ratingBefore: z.int().nonnegative(),
  ratingAfter: z.int().nonnegative().nullable(),
});
export type GamePlayer = z.infer<typeof GamePlayerSchema>;

/** Rating change, or null while the game is still in progress. */
export function getRatingDelta(
  player: Pick<GamePlayer, 'ratingBefore' | 'ratingAfter'>,
): number | null {
  return player.ratingAfter === null
    ? null
    : player.ratingAfter - player.ratingBefore;
}
