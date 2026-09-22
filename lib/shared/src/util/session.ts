import {
  GameCompletion,
  GameState,
  INITIAL_BOARD,
  LobbyMember,
  LobbyState,
  PostGameState,
  SessionState,
  UserID,
} from "../types/index.ts";
import { toGameMember, toLobbyMember, toPostGameMember } from "./member.ts";

export function toLobbyState(state: SessionState): LobbyState {
  if (state.phase === "lobby") {
    return state;
  }

  return {
    id: state.id,
    host: toLobbyMember(state.host),
    guest: toLobbyMember(state.guest),
    messages: state.messages,
    phase: "lobby",
  };
}

export function toGameState(
  state: SessionState,
  options: { whiteId: UserID; blackId: UserID; guest: LobbyMember },
): GameState {
  if (state.phase === "game") {
    return state;
  }

  return {
    id: state.id,
    host: toGameMember(state.host),
    guest: toGameMember(options.guest),
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
    completion: completion,
  };
}
