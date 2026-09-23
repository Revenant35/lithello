import {
  Clock,
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
  options: { white: SessionMember; black: SessionMember; clock: Clock },
): GameState {
  return {
    id: state.id,
    white: toGameMember(options.white, options.clock),
    black: toGameMember(options.black, options.clock),
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
