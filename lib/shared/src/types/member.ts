import { z } from "zod";

import { ClockSchema } from "./clock.ts";
import { UserIDSchema } from "./identifiers.ts";

export const SessionMemberSchema = z.object({
  id: UserIDSchema,
  name: z.string(),
  isConnected: z.boolean(),
  wins: z.int().nonnegative(),
});
export type SessionMember = z.infer<typeof SessionMemberSchema>;

export const LobbyMemberSchema = SessionMemberSchema.extend({
  isReady: z.boolean(),
});
export type LobbyMember = z.infer<typeof LobbyMemberSchema>;

export const GameMemberSchema = SessionMemberSchema.extend({
  clock: ClockSchema,
});
export type GameMember = z.infer<typeof GameMemberSchema>;

export const PostGameMemberSchema = SessionMemberSchema.extend({
  clock: ClockSchema,
});
export type PostGameMember = z.infer<typeof PostGameMemberSchema>;
