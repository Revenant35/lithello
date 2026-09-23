import { BOARD_SIZE, INITIAL_BOARD } from "./board.ts";
import {
  GameStateSchema,
  LobbyStateSchema,
  PostGameStateSchema,
  SessionMessageSchema,
  SessionStateSchema,
} from "./session.ts";

const SESSION_ID = "00000000-0000-4000-8000-000000000001" as const;
const HOST_ID = "00000000-0000-4000-8000-000000000002" as const;
const GUEST_ID = "00000000-0000-4000-8000-000000000003" as const;

const validSessionMemberBase = {
  id: HOST_ID,
  name: "Alice",
  isConnected: true,
  wins: 0,
};

const validGuestBase = { ...validSessionMemberBase, id: GUEST_ID, name: "Bob" };

// ---------------------------------------------------------------------------
// SessionMessageSchema
// ---------------------------------------------------------------------------

describe("SessionMessageSchema", () => {
  it("accepts a valid message", () => {
    expect(SessionMessageSchema.safeParse({ authorId: HOST_ID, content: "hello" }).success).toBe(
      true,
    );
  });

  it("accepts an empty string content", () => {
    expect(SessionMessageSchema.safeParse({ authorId: HOST_ID, content: "" }).success).toBe(true);
  });

  it("rejects a non-UUID authorId", () => {
    expect(SessionMessageSchema.safeParse({ authorId: "not-a-uuid", content: "hi" }).success).toBe(
      false,
    );
  });

  it("rejects a missing content field", () => {
    expect(SessionMessageSchema.safeParse({ authorId: HOST_ID }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// LobbyStateSchema
// ---------------------------------------------------------------------------

const validLobbyState = {
  id: SESSION_ID,
  phase: "lobby",
  host: { ...validSessionMemberBase, isReady: false },
  messages: [],
};

describe("LobbyStateSchema", () => {
  it("accepts a valid lobby state without a guest", () => {
    expect(LobbyStateSchema.safeParse(validLobbyState).success).toBe(true);
  });

  it("accepts a valid lobby state with a guest", () => {
    expect(
      LobbyStateSchema.safeParse({
        ...validLobbyState,
        guest: { ...validGuestBase, isReady: true },
      }).success,
    ).toBe(true);
  });

  it("rejects a wrong phase literal", () => {
    expect(LobbyStateSchema.safeParse({ ...validLobbyState, phase: "game" }).success).toBe(false);
  });

  it("rejects a host missing isReady", () => {
    expect(
      LobbyStateSchema.safeParse({ ...validLobbyState, host: validSessionMemberBase }).success,
    ).toBe(false);
  });

  it("rejects a non-UUID session id", () => {
    expect(LobbyStateSchema.safeParse({ ...validLobbyState, id: "bad" }).success).toBe(false);
  });

  it("rejects messages that are not an array", () => {
    expect(LobbyStateSchema.safeParse({ ...validLobbyState, messages: null }).success).toBe(false);
  });

  it("accepts a valid startAt iso date string", () => {
    expect(
      LobbyStateSchema.safeParse({ ...validLobbyState, startAt: "2026-09-22T10:00:00.000Z" })
        .success,
    ).toBe(true);
  });

  it("accepts a lobby state without startAt", () => {
    expect(LobbyStateSchema.safeParse(validLobbyState).success).toBe(true);
  });

  it("rejects a startAt value that is not an iso date string", () => {
    expect(LobbyStateSchema.safeParse({ ...validLobbyState, startAt: "not-a-date" }).success).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// GameStateSchema
// ---------------------------------------------------------------------------

const validGameState = {
  id: SESSION_ID,
  phase: "game",
  host: { ...validSessionMemberBase, isOfferingDraw: false },
  guest: { ...validGuestBase, isOfferingDraw: false },
  messages: [],
  whiteId: HOST_ID,
  blackId: GUEST_ID,
  activePlayerId: GUEST_ID,
  board: INITIAL_BOARD,
  history: [],
};

describe("GameStateSchema", () => {
  it("accepts a valid game state", () => {
    expect(GameStateSchema.safeParse(validGameState).success).toBe(true);
  });

  it("accepts history entries of kind move and pass", () => {
    expect(
      GameStateSchema.safeParse({
        ...validGameState,
        history: [
          { kind: "move", location: { row: 2, col: 3 }, playerColor: "w" },
          { kind: "pass", playerColor: "b" },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects a history entry with an unknown kind", () => {
    expect(
      GameStateSchema.safeParse({
        ...validGameState,
        history: [{ kind: "resign" }],
      }).success,
    ).toBe(false);
  });

  it("rejects a wrong phase literal", () => {
    expect(GameStateSchema.safeParse({ ...validGameState, phase: "lobby" }).success).toBe(false);
  });

  it("rejects a board with the wrong dimensions", () => {
    const shortBoard = Array.from({ length: BOARD_SIZE - 1 }, () => Array(BOARD_SIZE).fill(null));
    expect(GameStateSchema.safeParse({ ...validGameState, board: shortBoard }).success).toBe(false);
  });

  it("rejects a guest missing isOfferingDraw", () => {
    expect(GameStateSchema.safeParse({ ...validGameState, guest: validGuestBase }).success).toBe(
      false,
    );
  });

  it("rejects a non-UUID activePlayerId", () => {
    expect(GameStateSchema.safeParse({ ...validGameState, activePlayerId: "bad" }).success).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// PostGameStateSchema
// ---------------------------------------------------------------------------

const validPostGameState = {
  id: SESSION_ID,
  phase: "postgame",
  host: { ...validSessionMemberBase, isRequestingRematch: false },
  guest: { ...validGuestBase, isRequestingRematch: false },
  messages: [],
  whiteId: HOST_ID,
  blackId: GUEST_ID,
  completion: { reason: "victory", winnerId: HOST_ID },
  board: INITIAL_BOARD,
  history: [],
};

describe("PostGameStateSchema", () => {
  it("accepts a victory completion", () => {
    expect(PostGameStateSchema.safeParse(validPostGameState).success).toBe(true);
  });

  it("accepts a draw completion", () => {
    expect(
      PostGameStateSchema.safeParse({ ...validPostGameState, completion: { reason: "draw" } })
        .success,
    ).toBe(true);
  });

  it("accepts a resignation completion", () => {
    expect(
      PostGameStateSchema.safeParse({
        ...validPostGameState,
        completion: { reason: "resignation", resignerId: GUEST_ID },
      }).success,
    ).toBe(true);
  });

  it("rejects a completion with an unknown reason", () => {
    expect(
      PostGameStateSchema.safeParse({
        ...validPostGameState,
        completion: { reason: "timeout" },
      }).success,
    ).toBe(false);
  });

  it("rejects a victory completion missing winnerId", () => {
    expect(
      PostGameStateSchema.safeParse({
        ...validPostGameState,
        completion: { reason: "victory" },
      }).success,
    ).toBe(false);
  });

  it("rejects a wrong phase literal", () => {
    expect(PostGameStateSchema.safeParse({ ...validPostGameState, phase: "game" }).success).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// SessionStateSchema (discriminated union)
// ---------------------------------------------------------------------------

describe("SessionStateSchema", () => {
  it("parses a lobby state", () => {
    expect(SessionStateSchema.safeParse(validLobbyState).success).toBe(true);
  });

  it("parses a game state", () => {
    expect(SessionStateSchema.safeParse(validGameState).success).toBe(true);
  });

  it("parses a postgame state", () => {
    expect(SessionStateSchema.safeParse(validPostGameState).success).toBe(true);
  });

  it("rejects an unknown phase", () => {
    expect(SessionStateSchema.safeParse({ ...validLobbyState, phase: "unknown" }).success).toBe(
      false,
    );
  });

  it("rejects an object missing a phase field", () => {
    const { phase: _, ...rest } = validLobbyState;
    expect(SessionStateSchema.safeParse(rest).success).toBe(false);
  });
});
