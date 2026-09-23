import { TurnAction } from "@lithello/shared/types";

export type { SessionState } from "@lithello/shared/types";

// join callback shapes
export type JoinResult = { success: true } | { success: false; reason: "not-found" | "full" };

// Socket.IO event maps
export interface ClientToServerEvents {
  "session:create": (callback: (result: { success: true; sessionId: string }) => void) => void;
  "session:join": (payload: { sessionId: string }, callback: (result: JoinResult) => void) => void;
  "session:leave": () => void;
  "lobby:set-ready": (payload: { ready: boolean }) => void;
  "game:action": (action: TurnAction) => void;
  "game:resign": () => void;
  "rematch:requested": () => void;
  "rematch:accepted": () => void;
  "rematch:denied": () => void;
  "rematch:request-cancelled": () => void;
}

export interface ServerToClientEvents {
  "session:state": (state: unknown) => void;
}
