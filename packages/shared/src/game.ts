import { z } from 'zod';

export const GameIDSchema = z.uuid().brand('game');
export type GameID = z.infer<typeof GameIDSchema>;

export const GameSettingsSchema = z.object({});
export type GameSettings = z.infer<typeof GameSettingsSchema>;
