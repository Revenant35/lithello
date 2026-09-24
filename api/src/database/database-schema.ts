import { Generated, Insertable, Selectable, Updateable } from "kysely";

export type GameStatus = "active" | "finished";
export type GameResult = "white_win" | "black_win" | "draw";
export type GameEndReason = "normal" | "resignation" | "timeout";
export type GameMoveKind = "move" | "pass";

export interface GameTable {
  id: Generated<string>;
  white_id: string;
  black_id: string;
  start_clock_ms: number;
  status: GameStatus;
  result: GameResult | null;
  end_reason: GameEndReason | null;
  started_at: Generated<Date>;
  ended_at: Date | null;
}

export interface GameActionTable {
  id: Generated<string>;
  game_id: string;
  user_id: string;
  action_number: number;
  kind: GameMoveKind;
  clock_ms_remaining: number;
  row: number | null;
  col: number | null;
  created_at: Generated<Date>;
}

export interface GameMessageTable {
  id: Generated<string>;
  game_id: string;
  user_id: string;
  content: string;
  created_at: Generated<Date>;
}

export type GameRow = Selectable<GameTable>;
export type NewGameRow = Insertable<GameTable>;
export type GameRowUpdate = Updateable<GameTable>;

export type GameActionRow = Selectable<GameActionTable>;
export type NewGameActionRow = Insertable<GameActionTable>;
export type GameActionRowUpdate = Updateable<GameActionTable>;

export type GameMessageRow = Selectable<GameMessageTable>;
export type NewGameMessageRow = Insertable<GameMessageTable>;
export type GameMessageRowUpdate = Updateable<GameMessageTable>;

export interface DatabaseSchema {
  game: GameTable;
  game_action: GameActionTable;
  game_message: GameMessageTable;
}
