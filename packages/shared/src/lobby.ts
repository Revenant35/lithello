import { z } from 'zod';
import { UserSchema } from './user.ts';
import { GameIDSchema, GameSettingsSchema } from './game.ts';

export const LobbyIDSchema = z.uuid().brand('lobby');
export type LobbyID = z.infer<typeof LobbyIDSchema>;

export const LobbyMemberSchema = UserSchema.pick({
  id: true,
  name: true,
}).extend({
  ready: z.boolean(),
});
export type LobbyMember = z.infer<typeof LobbyMemberSchema>;

export const CreateLobbySchema = z.object({});
export type CreateLobby = z.infer<typeof CreateLobbySchema>;

export const UpdateLobbySchema = z.object({});
export type UpdateLobby = z.infer<typeof UpdateLobbySchema>;

const BaseLobbySchema = z.object({
  id: LobbyIDSchema,
  host: LobbyMemberSchema,
  gameSettings: GameSettingsSchema,
  expiresAt: z.coerce.date(),
});

export const OpenLobbySchema = BaseLobbySchema.extend({
  guest: LobbyMemberSchema.optional(),
  status: z.literal('open'),
});
export type OpenLobby = z.infer<typeof OpenLobbySchema>;

export const ClosedLobbySchema = BaseLobbySchema.extend({
  guest: LobbyMemberSchema,
  status: z.literal('closed'),
  gameId: GameIDSchema,
});
export type ClosedLobby = z.infer<typeof ClosedLobbySchema>;

export const LobbySchema = z.discriminatedUnion('status', [
  OpenLobbySchema,
  ClosedLobbySchema,
]);
export type Lobby = z.infer<typeof LobbySchema>;
