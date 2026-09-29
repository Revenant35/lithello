import { z } from 'zod';
import {
  GameIDSchema,
  GameMessageIDSchema,
  UserIDSchema,
} from './identifiers.ts';

export const GameMessageContentSchema = z.string().min(1).max(500);
export type GameMessageContent = z.infer<typeof GameMessageContentSchema>;

export const GameMessageSchema = z.object({
  id: GameMessageIDSchema,
  gameId: GameIDSchema,
  userId: UserIDSchema,
  content: GameMessageContentSchema,
  createdAt: z.coerce.date(),
});
export type GameMessage = z.infer<typeof GameMessageSchema>;
