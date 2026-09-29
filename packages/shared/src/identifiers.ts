import { z } from 'zod';

export const GameIDSchema = z.uuid().brand('game');
export type GameID = z.infer<typeof GameIDSchema>;

export const GameMessageIDSchema = z.uuid().brand('game-message');
export type GameMessageID = z.infer<typeof GameMessageIDSchema>;

export const GameTimeControlIDSchema = z.uuid().brand('game-time-control');
export type GameTimeControlID = z.infer<typeof GameTimeControlIDSchema>;

export const LobbyIDSchema = z.uuid().brand('lobby');
export type LobbyID = z.infer<typeof LobbyIDSchema>;

export const UserIDSchema = z.uuid().brand('user');
export type UserID = z.infer<typeof UserIDSchema>;
