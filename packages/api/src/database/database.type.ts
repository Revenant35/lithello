import type {
  game,
  gameMessage,
  gameMove,
  gameTimeControl,
  player,
  user,
} from './schema/index.ts';

export type UserRow = typeof user.$inferSelect;

export type PlayerRow = typeof player.$inferSelect;
export type NewPlayerRow = typeof player.$inferInsert;
export type PlayerRowUpdate = Partial<NewPlayerRow>;

export type GameTimeControlRow = typeof gameTimeControl.$inferSelect;
export type NewGameTimeControlRow = typeof gameTimeControl.$inferInsert;

export type GameRow = typeof game.$inferSelect;
export type NewGameRow = typeof game.$inferInsert;
export type GameRowUpdate = Partial<NewGameRow>;

export type GameMoveRow = typeof gameMove.$inferSelect;
export type NewGameMoveRow = typeof gameMove.$inferInsert;

export type GameMessageRow = typeof gameMessage.$inferSelect;
export type NewGameMessageRow = typeof gameMessage.$inferInsert;
