import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema.ts';

export const GAME_RESULTS = ['white_win', 'black_win', 'draw'] as const;
export type GameResult = (typeof GAME_RESULTS)[number];

export const GAME_END_REASONS = ['normal', 'resignation', 'timeout'] as const;
export type GameEndReason = (typeof GAME_END_REASONS)[number];

export const gameTimeControl = pgTable(
  'game_time_control',
  {
    id: uuid().primaryKey().defaultRandom(),
    startClockMs: integer().notNull(),
    incrementMs: integer().notNull().default(0),
  },
  (table) => [
    unique('game_time_control_unique').on(
      table.startClockMs,
      table.incrementMs,
    ),
    check(
      'game_time_control_start_clock_ms_valid',
      sql`${table.startClockMs} > 0`,
    ),
    check(
      'game_time_control_increment_ms_valid',
      sql`${table.incrementMs} >= 0`,
    ),
  ],
);

/**
 * A user's presence in the rating system. Keyed by userId rather than a
 * surrogate id, so a user has exactly one player record and the game tables can
 * keep referencing a user id while pointing at this table.
 */
export const player = pgTable(
  'player',
  {
    userId: uuid()
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    rating: smallint().notNull(),
  },
  (table) => [check('player_rating_valid', sql`${table.rating} >= 0`)],
);

export const game = pgTable(
  'game',
  {
    id: uuid().primaryKey().defaultRandom(),
    whiteUserId: uuid()
      .notNull()
      .references(() => player.userId),
    blackUserId: uuid()
      .notNull()
      .references(() => player.userId),
    timeControlId: uuid()
      .notNull()
      .references(() => gameTimeControl.id),
    whiteRatingBefore: smallint().notNull(),
    blackRatingBefore: smallint().notNull(),
    isRated: boolean().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp({ withTimezone: true }),
    endedAt: timestamp({ withTimezone: true }),
    result: varchar({ length: 16 }).$type<GameResult>(),
    endReason: varchar({ length: 16 }).$type<GameEndReason>(),
    finalWhitePieces: bigint({ mode: 'bigint' }),
    finalBlackPieces: bigint({ mode: 'bigint' }),
    whiteRatingAfter: smallint(),
    blackRatingAfter: smallint(),
  },
  (table) => [
    index('game_white_user_id_idx').on(table.whiteUserId),
    index('game_black_user_id_idx').on(table.blackUserId),
    index('game_active_idx')
      .on(table.id)
      .where(sql`${table.endedAt} is null`),
    check(
      'game_players_different',
      sql`${table.whiteUserId} <> ${table.blackUserId}`,
    ),
    check(
      'game_result_valid',
      sql`${table.result} is null or ${table.result} in ('white_win', 'black_win', 'draw')`,
    ),
    check(
      'game_end_reason_valid',
      sql`${table.endReason} is null or ${table.endReason} in ('normal', 'resignation', 'timeout')`,
    ),
    check(
      'game_result_iff_ended',
      sql`(${table.endedAt} is null) = (${table.result} is null)`,
    ),
    check(
      'game_end_reason_iff_ended',
      sql`(${table.endedAt} is null) = (${table.endReason} is null)`,
    ),
    check(
      'game_final_pieces_iff_ended',
      sql`(${table.endedAt} is null) = (${table.finalWhitePieces} is null)`,
    ),
    check(
      'game_final_pieces_both_or_neither',
      sql`(${table.finalWhitePieces} is null) = (${table.finalBlackPieces} is null)`,
    ),
    check(
      'game_final_pieces_disjoint',
      sql`${table.finalWhitePieces} & ${table.finalBlackPieces} = 0`,
    ),
    check(
      'game_started_after_created',
      sql`${table.startedAt} >= ${table.createdAt}`,
    ),
    check(
      'game_ended_after_started',
      sql`${table.endedAt} >= ${table.startedAt}`,
    ),
    check(
      'game_ended_requires_started',
      sql`${table.endedAt} is null or ${table.startedAt} is not null`,
    ),
    check(
      'game_white_rating_before_valid',
      sql`${table.whiteRatingBefore} >= 0`,
    ),
    check(
      'game_black_rating_before_valid',
      sql`${table.blackRatingBefore} >= 0`,
    ),
    check('game_white_rating_after_valid', sql`${table.whiteRatingAfter} >= 0`),
    check('game_black_rating_after_valid', sql`${table.blackRatingAfter} >= 0`),
    check(
      'game_rating_after_iff_ended',
      sql`(${table.endedAt} is null) = (${table.whiteRatingAfter} is null)`,
    ),
    check(
      'game_unrated_ratings_unchanged',
      sql`${table.isRated}
        or ${table.whiteRatingAfter} is null
        or (${table.whiteRatingAfter} = ${table.whiteRatingBefore}
          and ${table.blackRatingAfter} = ${table.blackRatingBefore})`,
    ),
    check(
      'game_rating_after_both_or_neither',
      sql`(${table.whiteRatingAfter} is null) = (${table.blackRatingAfter} is null)`,
    ),
  ],
);

export const gameMove = pgTable(
  'game_move',
  {
    gameId: uuid()
      .notNull()
      .references(() => game.id, { onDelete: 'cascade' }),
    ply: integer().notNull(),
    whitePieces: bigint({ mode: 'bigint' }).notNull(),
    blackPieces: bigint({ mode: 'bigint' }).notNull(),
    square: smallint(),
    whiteTimeMs: integer().notNull(),
    blackTimeMs: integer().notNull(),
    playedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.gameId, table.ply] }),
    unique('game_move_one_play_per_square').on(table.gameId, table.square),
    check(
      'game_move_square_valid',
      sql`${table.square} >= 0 and ${table.square} < 64`,
    ),
    check('game_move_ply_valid', sql`${table.ply} >= 0`),
    check(
      'game_move_pieces_disjoint',
      sql`${table.whitePieces} & ${table.blackPieces} = 0`,
    ),
    check('game_move_white_time_ms_valid', sql`${table.whiteTimeMs} >= 0`),
    check('game_move_black_time_ms_valid', sql`${table.blackTimeMs} >= 0`),
  ],
);

export const gameMessage = pgTable(
  'game_message',
  {
    id: uuid().primaryKey().defaultRandom(),
    gameId: uuid()
      .notNull()
      .references(() => game.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => player.userId),
    content: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('game_message_game_id_created_at_idx').on(
      table.gameId,
      table.createdAt,
    ),
    check(
      'game_message_content_not_blank',
      sql`${table.content} ~ '[^[:space:]]'`,
    ),
    check('game_message_content_length', sql`length(${table.content}) <= 500`),
  ],
);

export const gameTimeControlRelations = relations(
  gameTimeControl,
  ({ many }) => ({
    games: many(game),
  }),
);

export const playerRelations = relations(player, ({ one, many }) => ({
  user: one(user, { fields: [player.userId], references: [user.id] }),
  whiteGames: many(game, { relationName: 'gameWhitePlayer' }),
  blackGames: many(game, { relationName: 'gameBlackPlayer' }),
  messages: many(gameMessage),
}));

export const gameRelations = relations(game, ({ one, many }) => ({
  timeControl: one(gameTimeControl, {
    fields: [game.timeControlId],
    references: [gameTimeControl.id],
  }),
  whitePlayer: one(player, {
    fields: [game.whiteUserId],
    references: [player.userId],
    relationName: 'gameWhitePlayer',
  }),
  blackPlayer: one(player, {
    fields: [game.blackUserId],
    references: [player.userId],
    relationName: 'gameBlackPlayer',
  }),
  moves: many(gameMove),
  messages: many(gameMessage),
}));

export const gameMoveRelations = relations(gameMove, ({ one }) => ({
  game: one(game, { fields: [gameMove.gameId], references: [game.id] }),
}));

export const gameMessageRelations = relations(gameMessage, ({ one }) => ({
  game: one(game, { fields: [gameMessage.gameId], references: [game.id] }),
  player: one(player, {
    fields: [gameMessage.userId],
    references: [player.userId],
  }),
}));
