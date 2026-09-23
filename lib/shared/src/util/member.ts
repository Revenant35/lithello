import { Clock, GameMember, LobbyMember, PostGameMember, SessionMember } from "../types/index.ts";

function toSessionMember(member: SessionMember): SessionMember {
  return {
    id: member.id,
    name: member.name,
    wins: member.wins,
    isConnected: member.isConnected,
  };
}

export function toLobbyMember(member: SessionMember): LobbyMember {
  return {
    ...toSessionMember(member),
    isReady: false,
  };
}

export function toGameMember(member: SessionMember, clock: Clock): GameMember {
  return {
    ...toSessionMember(member),
    clock,
  };
}

export function toPostGameMember(member: GameMember): PostGameMember {
  return {
    ...toSessionMember(member),
    clock: member.clock,
  };
}
