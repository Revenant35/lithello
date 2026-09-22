import { INITIAL_BOARD } from "../types/board.ts";
import {
  type GameCompletion,
  type GameState,
  type LobbyState,
  type SessionState,
} from "../types/session.ts";
import { type UserID } from "../types/index.ts";
import { toGameState, toLobbyState, toPostGameState } from "./session.ts";

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

const gameMemberBase = { ...sessionMemberBase, isOfferingDraw: false };

const gameState: GameState = {
  id: SESSION_ID,
  phase: "game",
  host: gameMemberBase,
  guest: { ...gameMemberBase, id: GUEST_ID, name: "Bob" },
  messages: [],
  whiteId: HOST_ID,
  blackId: GUEST_ID,
  activePlayerId: GUEST_ID,
  board: INITIAL_BOARD,
  history: [],
};

// ---------------------------------------------------------------------------
// toLobbyState
// ---------------------------------------------------------------------------

describe("toLobbyState", () => {
  it("returns the state unchanged if already in lobby phase", () => {
    const result = toLobbyState(lobbyState);
    expect(result).toBe(lobbyState);
  });

  it("converts a game state to lobby phase", () => {
    const result = toLobbyState(gameState);
    expect(result.phase).toBe("lobby");
    expect(result.id).toBe(gameState.id);
    expect(result.messages).toBe(gameState.messages);
  });

  it("resets host to a lobby member with isReady false", () => {
    const result = toLobbyState(gameState);
    expect(result.host.isReady).toBe(false);
    expect(result.host.id).toBe(gameState.host.id);
    expect(result.host.name).toBe(gameState.host.name);
    expect(result.host.wins).toBe(gameState.host.wins);
    expect(result.host.isConnected).toBe(gameState.host.isConnected);
  });

  it("resets guest to a lobby member with isReady false", () => {
    const result = toLobbyState(gameState);
    expect(result.guest?.isReady).toBe(false);
    expect(result.guest?.id).toBe(gameState.guest.id);
  });

  it("preserves messages from the source state", () => {
    const stateWithMessages: GameState = {
      ...gameState,
      messages: [{ authorId: HOST_ID, content: "gg" }],
    };
    expect(toLobbyState(stateWithMessages).messages).toBe(stateWithMessages.messages);
  });
});

// ---------------------------------------------------------------------------
// toGameState
// ---------------------------------------------------------------------------

const gameOptions = {
  whiteId: HOST_ID,
  blackId: GUEST_ID,
  guest: { ...sessionMemberBase, id: GUEST_ID, name: "Bob", isReady: false },
};

describe("toGameState", () => {
  it("returns the state unchanged if already in game phase", () => {
    const result = toGameState(gameState, gameOptions);
    expect(result).toBe(gameState);
  });

  it("converts a lobby state to game phase", () => {
    const result = toGameState(lobbyState, gameOptions);
    expect(result.phase).toBe("game");
    expect(result.id).toBe(lobbyState.id);
    expect(result.messages).toBe(lobbyState.messages);
  });

  it("sets whiteId, blackId, and activePlayerId from options", () => {
    const result = toGameState(lobbyState, gameOptions);
    expect(result.whiteId).toBe(gameOptions.whiteId);
    expect(result.blackId).toBe(gameOptions.blackId);
    expect(result.activePlayerId).toBe(gameOptions.blackId);
  });

  it("initialises the board to INITIAL_BOARD and history to empty", () => {
    const result = toGameState(lobbyState, gameOptions);
    expect(result.board).toBe(INITIAL_BOARD);
    expect(result.history).toEqual([]);
  });

  it("converts host to a game member with isOfferingDraw false", () => {
    const result = toGameState(lobbyState, gameOptions);
    expect(result.host.isOfferingDraw).toBe(false);
    expect(result.host.id).toBe(lobbyState.host.id);
  });

  it("converts the provided guest option to a game member with isOfferingDraw false", () => {
    const result = toGameState(lobbyState, gameOptions);
    expect(result.guest.isOfferingDraw).toBe(false);
    expect(result.guest.id).toBe(gameOptions.guest.id);
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

  it("preserves id, whiteId, blackId, and messages", () => {
    const result = toPostGameState(gameState, completionVictory);
    expect(result.id).toBe(gameState.id);
    expect(result.whiteId).toBe(gameState.whiteId);
    expect(result.blackId).toBe(gameState.blackId);
    expect(result.messages).toBe(gameState.messages);
  });

  it("converts host to a post-game member with isRequestingRematch false", () => {
    const result = toPostGameState(gameState, completionVictory);
    expect(result.host.isRequestingRematch).toBe(false);
    expect(result.host.id).toBe(gameState.host.id);
    expect(result.host.name).toBe(gameState.host.name);
  });

  it("converts guest to a post-game member with isRequestingRematch false", () => {
    const result = toPostGameState(gameState, completionVictory);
    expect(result.guest.isRequestingRematch).toBe(false);
    expect(result.guest.id).toBe(gameState.guest.id);
  });
});
