import {
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from 'kysely';

export type GameStatus =
  | 'active'
  | 'finished'
  | 'abandoned';

export type GameResult =
  | 'black'
  | 'white'
  | 'draw';

export type GameEndReason =
  | 'normal'
  | 'resignation'
  | 'timeout'
  | 'disconnect';

export type PlayerColor =
  | 'black'
  | 'white';

export interface GameTable {
  id: string;

  black_user_id: string;
  white_user_id: string;

  status: Generated<GameStatus>;
  result: GameResult | null;
  end_reason: GameEndReason | null;

  current_board: string;
  current_turn: PlayerColor;

  version: Generated<number>;

  black_score: number | null;
  white_score: number | null;

  started_at: Generated<Date>;
  ended_at: Date | null;

  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface GameMoveTable {
  id: string;

  game_id: string;
  user_id: string;

  move_number: number;

  x: number;
  y: number;

  created_at: Generated<Date>;
}

export type Game = Selectable<GameTable>;
export type NewGame = Insertable<GameTable>;
export type GameUpdate = Updateable<GameTable>;

export type GameMove = Selectable<GameMoveTable>;
export type NewGameMove = Insertable<GameMoveTable>;
export type GameMoveUpdate = Updateable<GameMoveTable>;

export interface DatabaseSchema {
  game: GameTable;
  game_move: GameMoveTable;
}
