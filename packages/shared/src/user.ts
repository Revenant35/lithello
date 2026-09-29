import { z } from 'zod';
import { UserIDSchema } from './identifiers.ts';

export const UserSchema = z.object({
  id: UserIDSchema,
  name: z.string(),
});
export type User = z.infer<typeof UserSchema>;
