import { LobbyIDSchema, UserIDSchema } from '@lithello/shared';
import { z } from 'zod';

const LobbyEntrySchema = z.object({
  userId: UserIDSchema,
  lobbyId: LobbyIDSchema,
});

export const LobbyEntryCodec = z.codec(
  z.string().regex(/^[^:]+:[^:]+$/, 'Expected format userId:lobbyId'),
  LobbyEntrySchema,
  {
    decode: (str) => {
      const [userId, lobbyId] = str.split(':');
      return { userId, lobbyId };
    },
    encode: ({ userId, lobbyId }) => `${userId}:${lobbyId}`,
  },
);
export type LobbyEntry = z.infer<typeof LobbyEntrySchema>;