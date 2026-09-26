import { z } from 'zod';
import { UserIDSchema } from '@lithello/shared';

export const UserConnectionEventSchema = z.object({
  userId: UserIDSchema,
  isConnected: z.boolean(),
});
export type UserConnectionEvent = z.infer<typeof UserConnectionEventSchema>;
