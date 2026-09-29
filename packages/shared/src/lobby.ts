import { z } from 'zod';
import { UserSchema } from './user.ts';
import { GameID, GameIDSchema, LobbyIDSchema } from './identifiers.ts';

export const LobbyMemberSchema = UserSchema.pick({
  id: true,
  name: true,
}).extend({
  isReady: z.boolean(),
  isConnected: z.boolean(),
});
export type LobbyMember = z.infer<typeof LobbyMemberSchema>;

const BaseLobbySchema = z.object({
  id: LobbyIDSchema,
  host: LobbyMemberSchema,
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

export interface ClientToServerLobbyEvents {
  ready: () => void;
  unready: () => void;
  state: () => void;
  leave: () => void;
}

export interface ServerToClientLobbyEvents {
  state: (lobby: Lobby) => void;
  'game-started': (data: { gameId: GameID }) => void;
}
