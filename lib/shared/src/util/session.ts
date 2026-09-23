import {
  GameCompletion,
  GameState,
  INITIAL_BOARD,
  LobbyState,
  PostGameState,
  SessionMember,
} from "../types/index.ts";
import { toGameMember, toPostGameMember } from "./member.ts";

export function toGameState(
  state: LobbyState | PostGameState,
  options: { white: SessionMember; black: SessionMember },
): GameState {
  return {
    id: state.id,
    white: toGameMember(options.white),
    black: toGameMember(options.black),
    messages: state.messages,
    phase: "game",
    board: INITIAL_BOARD,
    history: [],
    activePlayerId: options.black.id,
    drawStatus: { status: "idle" },
  };
}

export function toPostGameState(state: GameState, completion: GameCompletion): PostGameState {
  return {
    id: state.id,
    white: toPostGameMember(state.white),
    black: toPostGameMember(state.black),
    messages: state.messages,
    phase: "postgame",
    completion,
    board: state.board,
    history: state.history,
    rematchStatus: { status: "idle" },
  };
}
