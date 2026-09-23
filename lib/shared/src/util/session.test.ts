import { INITIAL_BOARD } from "../types/board.ts";
import {
  type GameCompletion,
  type GameState,
  type LobbyState,
  type SessionState,
} from "../types/session.ts";
import { type Clock, type UserID } from "../types/index.ts";
import { toGameState, toPostGameState } from "./session.ts";

const SESSION_ID = "00000000-0000-4000-8000-000000000001" as const as SessionState["id"];
const HOST_ID = "00000000-0000-4000-8000-000000000002" as const as UserID;
const GUEST_ID = "00000000-0000-4000-8000-000000000003" as const as UserID;

const sessionMemberBase = {
  id: HOST_ID,
  name: "Alice",
  isConnected: true,
  wins: 3,
};

const lobbyState: LobbyState = {
  id: SESSION_ID,
  phase: "lobby",
  host: { ...sessionMemberBase, isReady: true },
  messages: [{ authorId: HOST_ID, content: "hello" }],
};

const idleClock: Clock = { kind: "idle", clockTimeMilliseconds: 300000 };

const gameState: GameState = {
  id: SESSION_ID,
  phase: "game",
  white: { ...sessionMemberBase, clock: idleClock },
  black: { ...sessionMemberBase, id: GUEST_ID, name: "Bob", clock: idleClock },
  messages: [],
  activePlayerId: GUEST_ID,
  board: INITIAL_BOARD,
  history: [],
  drawStatus: { status: "idle" },
};

// ---------------------------------------------------------------------------
// toGameState
// ---------------------------------------------------------------------------

const gameOptions = {
  white: sessionMemberBase,
  black: { ...sessionMemberBase, id: GUEST_ID, name: "Bob", isReady: false },
  clock: idleClock,
};

describe("toGameState", () => {
  it("converts a lobby state to game phase", () => {
    const result = toGameState(lobbyState, gameOptions);
    expect(result.phase).toBe("game");
    expect(result.id).toBe(lobbyState.id);
    expect(result.messages).toBe(lobbyState.messages);
  });

  it("sets activePlayerId to the black player's id", () => {
    const result = toGameState(lobbyState, gameOptions);
    expect(result.activePlayerId).toBe(gameOptions.black.id);
  });

  it("initialises the board to INITIAL_BOARD and history to empty", () => {
    const result = toGameState(lobbyState, gameOptions);
    expect(result.board).toBe(INITIAL_BOARD);
    expect(result.history).toEqual([]);
  });

  it("copies white player session member fields from options", () => {
    const result = toGameState(lobbyState, gameOptions);
    expect(result.white.id).toBe(gameOptions.white.id);
  });

  it("copies black player session member fields from options", () => {
    const result = toGameState(lobbyState, gameOptions);
    expect(result.black.id).toBe(gameOptions.black.id);
  });

  it("initialises drawStatus to idle", () => {
    const result = toGameState(lobbyState, gameOptions);
    expect(result.drawStatus).toEqual({ status: "idle" });
  });

  it("sets clock on both players from options", () => {
    const result = toGameState(lobbyState, gameOptions);
    expect(result.white.clock).toBe(gameOptions.clock);
    expect(result.black.clock).toBe(gameOptions.clock);
  });
});

// ---------------------------------------------------------------------------
// toPostGameState
// ---------------------------------------------------------------------------

const completionVictory: GameCompletion = { reason: "victory", winnerId: HOST_ID };
const completionDraw: GameCompletion = { reason: "draw" };
const completionResignation: GameCompletion = { reason: "resignation", resignerId: GUEST_ID };

describe("toPostGameState", () => {
  it("converts a game state to postgame phase with a victory completion", () => {
    const result = toPostGameState(gameState, completionVictory);
    expect(result.phase).toBe("postgame");
    expect(result.completion).toEqual(completionVictory);
  });

  it("converts a game state to postgame phase with a draw completion", () => {
    expect(toPostGameState(gameState, completionDraw).completion).toEqual(completionDraw);
  });

  it("converts a game state to postgame phase with a resignation completion", () => {
    expect(toPostGameState(gameState, completionResignation).completion).toEqual(
      completionResignation,
    );
  });

  it("preserves id and messages", () => {
    const result = toPostGameState(gameState, completionVictory);
    expect(result.id).toBe(gameState.id);
    expect(result.messages).toBe(gameState.messages);
  });

  it("copies white player session member fields", () => {
    const result = toPostGameState(gameState, completionVictory);
    expect(result.white.id).toBe(gameState.white.id);
    expect(result.white.name).toBe(gameState.white.name);
  });

  it("copies black player session member fields", () => {
    const result = toPostGameState(gameState, completionVictory);
    expect(result.black.id).toBe(gameState.black.id);
  });

  it("initialises rematchStatus to idle", () => {
    const result = toPostGameState(gameState, completionVictory);
    expect(result.rematchStatus).toEqual({ status: "idle" });
  });

  it("preserves clock for both players", () => {
    const result = toPostGameState(gameState, completionVictory);
    expect(result.white.clock).toBe(gameState.white.clock);
    expect(result.black.clock).toBe(gameState.black.clock);
  });
});
