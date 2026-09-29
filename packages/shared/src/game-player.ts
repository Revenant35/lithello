import { z } from 'zod';
import { GameIDSchema, UserIDSchema } from './identifiers.ts';

export const PlayerColorSchema = z.enum(['w', 'b']);
export type PlayerColor = z.infer<typeof PlayerColorSchema>;

export const GamePlayerSchema = z.object({
  gameId: GameIDSchema,
  userId: UserIDSchema,
  color: PlayerColorSchema,
  ratingBefore: z.int().nonnegative(),
  ratingAfter: z.int().nonnegative().nullable(),
});
export type GamePlayer = z.infer<typeof GamePlayerSchema>;

export function getRatingDelta(player: GamePlayer): number | null {
  return player.ratingAfter === null
    ? null
    : player.ratingAfter - player.ratingBefore;
}
