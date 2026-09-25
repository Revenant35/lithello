import { z } from 'zod';

export const UserIDSchema = z.uuid().brand('user');

export const UserSchema = z.object({
  id: UserIDSchema,
  name: z.string(),
});

export type UserID = z.infer<typeof UserIDSchema>;
