import { z } from "zod";

import { GameMemberSchema, LobbyMemberSchema, PostGameMemberSchema } from "./member.ts";
import { BoardSchema, BoardLocationSchema, PlayerColorSchema } from "./board.ts";
import { SessionIDSchema, UserIDSchema } from "./identifiers.ts";

export const GameCompletionSchema = z.discriminatedUnion("reason", [
  z.object({
    reason: z.literal("resignation"),
    resignerId: UserIDSchema,
  }),
  z.object({
    reason: z.literal("draw"),
  }),
  z.object({
    reason: z.literal("victory"),
    winnerId: UserIDSchema,
  }),
  z.object({
    reason: z.literal("timeout"),
    winnerId: UserIDSchema,
  }),
]);
export type GameCompletion = z.infer<typeof GameCompletionSchema>;

export const TurnActionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("move"),
    location: BoardLocationSchema,
    playerColor: PlayerColorSchema,
  }),
  z.object({
    kind: z.literal("pass"),
    playerColor: PlayerColorSchema,
  }),
]);
export type TurnAction = z.infer<typeof TurnActionSchema>;

export const SessionMessageSchema = z.object({
  authorId: UserIDSchema,
  content: z.string(),
});
export type SessionMessage = z.infer<typeof SessionMessageSchema>;

const BaseSessionStateSchema = z.object({
  id: SessionIDSchema,
  messages: z.array(SessionMessageSchema),
});

export const LobbyStateSchema = BaseSessionStateSchema.extend({
  phase: z.literal("lobby"),
  host: LobbyMemberSchema,
  guest: LobbyMemberSchema.optional(),
  startAt: z.iso.datetime().optional(),
});
export type LobbyState = z.infer<typeof LobbyStateSchema>;

export const DrawStatusSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("idle") }),
  z.object({ status: z.literal("offered"), offererId: UserIDSchema }),
]);
export type DrawStatus = z.infer<typeof DrawStatusSchema>;

export const GameStateSchema = BaseSessionStateSchema.extend({
  phase: z.literal("game"),
  activePlayerId: UserIDSchema,
  white: GameMemberSchema,
  black: GameMemberSchema,
  board: BoardSchema,
  history: z.array(TurnActionSchema),
  drawStatus: DrawStatusSchema,
});
export type GameState = z.infer<typeof GameStateSchema>;

export const RematchStatusSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("idle") }),
  z.object({
    status: z.literal("requested"),
    requesterId: UserIDSchema,
  }),
]);
export type RematchStatus = z.infer<typeof RematchStatusSchema>;

export const PostGameStateSchema = BaseSessionStateSchema.extend({
  phase: z.literal("postgame"),
  white: PostGameMemberSchema,
  black: PostGameMemberSchema,
  completion: GameCompletionSchema,
  board: BoardSchema,
  history: z.array(TurnActionSchema),
  rematchStatus: RematchStatusSchema,
});
export type PostGameState = z.infer<typeof PostGameStateSchema>;

export const SessionStateSchema = z.discriminatedUnion("phase", [
  LobbyStateSchema,
  GameStateSchema,
  PostGameStateSchema,
]);
export type SessionState = z.infer<typeof SessionStateSchema>;
