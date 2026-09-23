import {
  GameCompletion,
  GameState,
  INITIAL_BOARD,
  LobbyMember,
  LobbyState,
  PostGameState,
  SessionMember,
  UserID,
} from "../types/index.ts";
import { toGameMember, toLobbyMember, toPostGameMember } from "./member.ts";

export function toLobbyState(state: LobbyState): LobbyState;
export function toLobbyState(state: GameState | PostGameState): LobbyState;
export function toLobbyState(state: LobbyState | GameState | PostGameState): LobbyState {
  if (state.phase === "lobby") return state;

  return {
    id: state.id,
    host: toLobbyMember(state.host),
    guest: state.guest !== undefined ? toLobbyMember(state.guest) : undefined,
    messages: state.messages,
    phase: "lobby",
  };
}

export function toGameState(
  state: GameState,
  options: { whiteId: UserID; blackId: UserID; guest?: LobbyMember },
): GameState;

export function toGameState(
  state: LobbyState,
  options: { whiteId: UserID; blackId: UserID; guest: LobbyMember },
): GameState;

export function toGameState(
  state: PostGameState,
  options: { whiteId: UserID; blackId: UserID },
): GameState;

export function toGameState(
  state: GameState | LobbyState | PostGameState,
  options: { whiteId: UserID; blackId: UserID; guest?: LobbyMember },
): GameState {
  if (state.phase === "game") return state;

  let guest: SessionMember;
  if (state.phase === "lobby") {
    guest = options.guest!; // TODO: Don't love this...
  } else {
    guest = state.guest;
  }

  return {
    id: state.id,
    host: toGameMember(state.host),
    guest: toGameMember(guest),
    messages: state.messages,
    phase: "game",
    board: INITIAL_BOARD,
    history: [],
    whiteId: options.whiteId,
    blackId: options.blackId,
    activePlayerId: options.blackId,
  };
}

export function toPostGameState(state: GameState, completion: GameCompletion): PostGameState {
  return {
    id: state.id,
    whiteId: state.whiteId,
    blackId: state.blackId,
    host: toPostGameMember(state.host),
    guest: toPostGameMember(state.guest),
    messages: state.messages,
    phase: "postgame",
    completion,
    board: state.board,
    history: state.history,
  };
}
