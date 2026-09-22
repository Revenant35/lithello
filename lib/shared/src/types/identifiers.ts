import { z } from "zod";

export const UserIDSchema = z.uuid().brand("user");
export const SessionIDSchema = z.uuid().brand("session");

export type UserID = z.infer<typeof UserIDSchema>;
export type SessionID = z.infer<typeof SessionIDSchema>;
