import { z } from 'zod';
import { UserSchema } from './user.ts';
import { GameIDSchema, GameSettingsSchema } from './game.ts';

export const LobbyIDSchema = z.uuid().brand('lobby');
export type LobbyID = z.infer<typeof LobbyIDSchema>;

export const ConnectionStateSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('connected') }),
  z.object({ status: z.literal('disconnected'), expiresAt: z.coerce.date() }),
]);
export type ConnectionState = z.infer<typeof ConnectionStateSchema>;

export const LobbyMemberSchema = UserSchema.pick({
  id: true,
  name: true,
}).extend({
  isReady: z.boolean(),
  connection: ConnectionStateSchema,
});
export type LobbyMember = z.infer<typeof LobbyMemberSchema>;

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

export const SetLobbyReadinessSchema = z.object({
  isReady: z.boolean(),
});
export type SetLobbyReadiness = z.infer<typeof SetLobbyReadinessSchema>;

export interface ClientToServerLobbyEvents {
  'set-ready': (data: SetLobbyReadiness) => void;
  state: () => void;
  leave: () => void;
}

export interface ServerToClientLobbyEvents {
  state: (lobby: Lobby) => void;
}
