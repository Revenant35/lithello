import { LobbyIDSchema, UserIDSchema } from '@lithello/shared';
import { z } from 'zod';

export const LobbyConnectionEventSchema = z.object({
  lobbyId: LobbyIDSchema,
  userId: UserIDSchema,
  isConnected: z.boolean(),
});
export type LobbyConnectionEvent = z.infer<typeof LobbyConnectionEventSchema>;
