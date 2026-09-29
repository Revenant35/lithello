import { type Player, UserIDSchema } from '@lithello/shared';
import type { PlayerRow, UserRow } from '../database/database.type.ts';

/**
 * A Player is the user and their rating together, so it takes both rows. The
 * player table is keyed by userId, which is the id the domain uses.
 */
export function toPlayer(playerRow: PlayerRow, userRow: UserRow): Player {
  return {
    id: UserIDSchema.parse(playerRow.userId),
    name: userRow.name,
    rating: playerRow.rating,
  };
}
