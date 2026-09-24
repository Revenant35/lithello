import { z } from "zod";

export const UserIDSchema = z.uuid().brand("user");
export const SessionIDSchema = z.uuid().brand("session");
export const GameIDSchema = z.uuid().brand("game");
export const GameActionIDSchema = z.uuid().brand("game_action");
export const GameMessageIDSchema = z.uuid().brand("game_message");

export type UserID = z.infer<typeof UserIDSchema>;
export type SessionID = z.infer<typeof SessionIDSchema>;
export type GameID = z.infer<typeof GameIDSchema>;
export type GameActionID = z.infer<typeof GameActionIDSchema>;
export type GameMessageID = z.infer<typeof GameMessageIDSchema>;
