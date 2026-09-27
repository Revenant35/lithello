import { GameIDSchema, UserIDSchema } from '@lithello/shared';
import { z } from 'zod';

const GameEntrySchema = z.object({
  userId: UserIDSchema,
  gameId: GameIDSchema,
});

export const GameEntryCodec = z.codec(
  z.string().regex(/^[^:]+:[^:]+$/, 'Expected format userId:gameId'),
  GameEntrySchema,
  {
    decode: (str) => {
      const [userId, gameId] = str.split(':');
      return { userId, gameId };
    },
    encode: ({ userId, gameId }) => `${userId}:${gameId}`,
  },
);
export type GameEntry = z.infer<typeof GameEntrySchema>;
