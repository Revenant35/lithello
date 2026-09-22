import { GameMember, LobbyMember, PostGameMember, SessionMember } from "../types/index.ts";

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

export function toGameMember(member: SessionMember): GameMember {
  return {
    ...toSessionMember(member),
    isOfferingDraw: false,
  };
}

export function toPostGameMember(member: SessionMember): PostGameMember {
  return {
    ...toSessionMember(member),
    isRequestingRematch: false,
  };
}
