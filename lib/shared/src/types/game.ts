import { z } from "zod";

import {
  GameActionIDSchema,
  GameIDSchema,
  GameMessageIDSchema,
  UserIDSchema,
} from "./identifiers.ts";

export const GameStatusSchema = z.enum(["active", "finished"]);
export type GameStatus = z.infer<typeof GameStatusSchema>;

export const GameResultSchema = z.enum(["white_win", "black_win", "draw"]);
export type GameResult = z.infer<typeof GameResultSchema>;

export const GameEndReasonSchema = z.enum(["normal", "resignation", "timeout"]);
export type GameEndReason = z.infer<typeof GameEndReasonSchema>;

const BaseGameSchema = z.object({
  id: GameIDSchema,
  white_id: UserIDSchema,
  black_id: UserIDSchema,
  start_clock_ms: z.int().positive(),
  started_at: z.coerce.date(),
});

export const ActiveGameSchema = BaseGameSchema.extend({
  status: z.literal("active"),
});
export type ActiveGame = z.infer<typeof ActiveGameSchema>;

export const FinishedGameSchema = BaseGameSchema.extend({
  status: z.literal("finished"),
  result: GameResultSchema,
  end_reason: GameEndReasonSchema,
  ended_at: z.coerce.date(),
});
export type FinishedGame = z.infer<typeof FinishedGameSchema>;

export const GameSchema = z.discriminatedUnion("status", [
  ActiveGameSchema,
  FinishedGameSchema,
]);
export type Game = z.infer<typeof GameSchema>;

const BaseGameActionSchema = z.object({
  id: GameActionIDSchema,
  game_id: GameIDSchema,
  user_id: UserIDSchema,
  action_number: z.int().min(1).max(256),
  clock_ms_remaining: z.int().nonnegative(),
  created_at: z.coerce.date(),
});

export const GameMoveActionSchema = BaseGameActionSchema.extend({
  kind: z.literal("move"),
  row: z.int().min(0).max(7),
  col: z.int().min(0).max(7),
});
export type GameMoveAction = z.infer<typeof GameMoveActionSchema>;

export const GamePassActionSchema = BaseGameActionSchema.extend({
  kind: z.literal("pass"),
});
export type GamePassAction = z.infer<typeof GamePassActionSchema>;

export const GameActionSchema = z.discriminatedUnion("kind", [
  GameMoveActionSchema,
  GamePassActionSchema,
]);
export type GameAction = z.infer<typeof GameActionSchema>;

export const GameMessageSchema = z.object({
  id: GameMessageIDSchema,
  game_id: GameIDSchema,
  user_id: UserIDSchema,
  content: z.string().min(1).max(500),
  created_at: z.coerce.date(),
});
export type GameMessage = z.infer<typeof GameMessageSchema>;
