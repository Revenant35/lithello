import { z } from "zod";
import {
  SessionIDSchema,
  SessionStateSchema,
  TurnActionSchema,
  UserIDSchema,
} from "@lithello/shared/types";

// Re-export schemas used in SessionView
export { SessionIDSchema as sessionIDSchema, SessionStateSchema as sessionStateSchema };
export type { SessionState } from "@lithello/shared/types";

// PlayerID is a UserID — branded the same way
export const PlayerIDSchema = UserIDSchema;
export type PlayerID = z.infer<typeof PlayerIDSchema>;

// join callback shapes
export type JoinResult = { success: true } | { success: false; reason: "not-found" | "full" };

// Socket.IO event maps
export interface ClientToServerEvents {
  "session:create": (callback: (result: { success: true; sessionId: string }) => void) => void;
  "session:join": (payload: { sessionId: string }, callback: (result: JoinResult) => void) => void;
  "session:leave": () => void;
  "lobby:set-ready": (payload: { ready: boolean }) => void;
  "game:action": (action: z.infer<typeof TurnActionSchema>) => void;
  "game:resign": () => void;
  "rematch:requested": () => void;
  "rematch:accepted": () => void;
  "rematch:denied": () => void;
  "rematch:request-cancelled": () => void;
}

export interface ServerToClientEvents {
  "session:state": (state: unknown) => void;
}
