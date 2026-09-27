import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

export type GameStatus = 'active' | 'finished';
export type GameResult = 'white_win' | 'black_win' | 'draw';
export type GameEndReason = 'normal' | 'resignation' | 'timeout';
export type GameMoveKind = 'move' | 'pass';

export interface UserTable {
  id: Generated<string>;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface GameTable {
  id: Generated<string>;
  whiteId: string;
  blackId: string;
  startClockMs: number;
  status: Generated<GameStatus>;
  result: GameResult | null;
  endReason: GameEndReason | null;
  board: Generated<string>;
  startedAt: Generated<Date>;
  endedAt: Date | null;
}

export interface GameActionTable {
  id: Generated<string>;
  gameId: string;
  userId: string;
  actionNumber: number;
  kind: GameMoveKind;
  clockMsRemaining: number | null;
  row: number | null;
  col: number | null;
  createdAt: Generated<Date>;
}

export interface GameMessageTable {
  id: Generated<string>;
  gameId: string;
  userId: string;
  content: string;
  createdAt: Generated<Date>;
}

export type UserRow = Selectable<UserTable>;

export type GameRow = Selectable<GameTable>;
export type NewGameRow = Insertable<GameTable>;
export type GameRowUpdate = Updateable<GameTable>;

export type GameActionRow = Selectable<GameActionTable>;
export type NewGameActionRow = Insertable<GameActionTable>;
export type GameActionRowUpdate = Updateable<GameActionTable>;

export type GameMessageRow = Selectable<GameMessageTable>;
export type NewGameMessageRow = Insertable<GameMessageTable>;
export type GameMessageRowUpdate = Updateable<GameMessageTable>;

export interface Database {
  user: UserTable;
  game: GameTable;
  gameAction: GameActionTable;
  gameMessage: GameMessageTable;
}
