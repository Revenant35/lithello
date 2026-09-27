import { GameIDSchema, UserIDSchema } from '@lithello/shared';
import { z } from 'zod';

export const GameConnectionEventSchema = z.object({
  gameId: GameIDSchema,
  userId: UserIDSchema,
  isConnected: z.boolean(),
});
export type GameConnectionEvent = z.infer<typeof GameConnectionEventSchema>;
