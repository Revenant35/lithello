import { Inject, Injectable } from '@nestjs/common';
import { asc, desc, eq } from 'drizzle-orm';
import type { Player, UserID } from '@lithello/shared';
import { type Database, DRIZZLE } from '../database/drizzle.provider.ts';
import { player, user } from '../database/schema/index.ts';
import { toPlayer } from './player.mapper.ts';

/** CRUD over the player table. A Player is always joined with its user row. */
@Injectable()
export class PlayerRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async getPlayer(args: { id: UserID }): Promise<Player | null> {
    const [row] = await this.db
      .select()
      .from(player)
      .innerJoin(user, eq(player.userId, user.id))
      .where(eq(player.userId, args.id))
      .limit(1);

    if (row === undefined) {
      return null;
    }

    return toPlayer(row.player, row.user);
  }

  /**
   * Highest rated first. `userId` breaks ties so that paging stays stable -
   * without a unique tiebreak, equal ratings can shuffle between pages and
   * silently skip or repeat rows.
   */
  async getPlayers(args: {
    limit?: number;
    offset?: number;
  }): Promise<Player[]> {
    const { limit = 20, offset = 0 } = args;

    const rows = await this.db
      .select()
      .from(player)
      .innerJoin(user, eq(player.userId, user.id))
      .orderBy(desc(player.rating), asc(player.userId))
      .limit(limit)
      .offset(offset);

    return rows.map((row) => toPlayer(row.player, row.user));
  }

  /** Overwrites a player's rating; the caller has already worked out the value. */
  async updateRating(args: { userId: UserID; rating: number }): Promise<void> {
    await this.db
      .update(player)
      .set({ rating: args.rating })
      .where(eq(player.userId, args.userId));
  }

  async createPlayer(args: {
    userId: UserID;
    rating: number;
  }): Promise<Player> {
    const [row] = await this.db.insert(player).values(args).returning();

    if (row === undefined) {
      throw new Error('Insert returned no player');
    }

    const created = await this.getPlayer({ id: args.userId });

    if (created === null) {
      throw new Error('Player disappeared immediately after insert');
    }

    return created;
  }
}
