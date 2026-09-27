import { z } from 'zod';
import { UserSchema } from './user.ts';
import { GameClockSchema } from './game-clock.ts';
import {
  BoardLocation,
  BoardLocationSchema,
  BoardSchema,
  PlayerColorSchema,
} from './game-board.ts';

export const GameIDSchema = z.uuid().brand('game');
export type GameID = z.infer<typeof GameIDSchema>;

export const GameSettingsSchema = z.object({});
export type GameSettings = z.infer<typeof GameSettingsSchema>;

export const GameMemberSchema = UserSchema.extend({
  clock: GameClockSchema,
  isConnected: z.boolean(),
});
export type GameMember = z.infer<typeof GameMemberSchema>;

const BaseGameActionSchema = z.object({
  playerColor: PlayerColorSchema,
});

const GameMoveSchema = BaseGameActionSchema.extend({
  location: BoardLocationSchema,
});
export type GameMove = z.infer<typeof GameMoveSchema>;

export const GameActionSchema = z.discriminatedUnion('kind', [
  GameMoveSchema.extend({
    kind: z.literal('move'),
    clockMsRemaining: z.int().nonnegative(),
  }),
  BaseGameActionSchema.extend({
    kind: z.literal('pass'),
  }),
]);
export type GameAction = z.infer<typeof GameActionSchema>;

export const GameMessageContentSchema = z.string().min(1).max(500);
export type GameMessageContent = z.infer<typeof GameMessageContentSchema>;

export const GameMessageSchema = z.object({
  user: UserSchema,
  content: z.string().min(1).max(500),
  createdAt: z.coerce.date(),
});
export type GameMessage = z.infer<typeof GameMessageSchema>;

export const PlayerScoreSchema = z.int().min(1).max(64);
export type PlayerScore = z.infer<typeof PlayerScoreSchema>;

export const GameScoreSchema = z.object({
  white: PlayerScoreSchema,
  black: PlayerScoreSchema,
});
export type GameScore = z.infer<typeof GameScoreSchema>;

export const BaseGameStateSchema = z.object({
  white: GameMemberSchema,
  black: GameMemberSchema,
  board: BoardSchema,
  score: GameScoreSchema,
  messages: z.array(GameMessageSchema),
  moveHistory: z.array(GameActionSchema),
});

export const ActiveGameStateSchema = BaseGameStateSchema.extend({
  activePlayer: PlayerColorSchema,
  possibleMoves: z.array(BoardLocationSchema),
});
export type ActiveGameState = z.infer<typeof ActiveGameStateSchema>;

export const FinishedGameStateSchema = BaseGameStateSchema.extend({
  result: z.enum(['white_win', 'black_win', 'draw']),
  endReason: z.enum(['normal', 'resignation', 'timeout']),
  endedAt: z.coerce.date(),
});
export type FinishedGameState = z.infer<typeof FinishedGameStateSchema>;

export const GameStateSchema = z.discriminatedUnion('status', [
  ActiveGameStateSchema.extend({
    status: z.literal('active'),
  }),
  FinishedGameStateSchema.extend({
    status: z.literal('finished'),
  }),
]);
export type GameState = z.infer<typeof GameStateSchema>;

export interface ClientToServerGameEvents {
  'get-state': () => void;
  move: (move: BoardLocation) => void;
  resign: () => void;
  'send-message': (content: GameMessageContent) => void;
}

export interface ServerToClientGameEvents {
  state: (game: GameState) => void;
}
