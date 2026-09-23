import { type Clock, type GameMember, type SessionMember } from "../types/index.ts";
import { toGameMember, toLobbyMember, toPostGameMember } from "./member.ts";

const VALID_UUID = "00000000-0000-4000-8000-000000000000" as SessionMember["id"];

const sessionMember: SessionMember = {
  id: VALID_UUID,
  name: "Alice",
  isConnected: true,
  wins: 3,
};

const idleClock: Clock = { kind: "idle", clockTimeMilliseconds: 300000 };
const gameMember: GameMember = { ...sessionMember, clock: idleClock };

describe("toLobbyMember", () => {
  it("copies all SessionMember fields", () => {
    const result = toLobbyMember(sessionMember);
    expect(result.id).toBe(sessionMember.id);
    expect(result.name).toBe(sessionMember.name);
    expect(result.isConnected).toBe(sessionMember.isConnected);
    expect(result.wins).toBe(sessionMember.wins);
  });

  it("sets isReady to false", () => {
    expect(toLobbyMember(sessionMember).isReady).toBe(false);
  });

  it("does not carry over unexpected fields", () => {
    const result = toLobbyMember(sessionMember);
    expect(Object.keys(result)).toEqual(["id", "name", "wins", "isConnected", "isReady"]);
  });
});

describe("toGameMember", () => {
  it("copies all SessionMember fields", () => {
    const result = toGameMember(sessionMember, idleClock);
    expect(result.id).toBe(sessionMember.id);
    expect(result.name).toBe(sessionMember.name);
    expect(result.isConnected).toBe(sessionMember.isConnected);
    expect(result.wins).toBe(sessionMember.wins);
  });

  it("sets clock from the parameter", () => {
    expect(toGameMember(sessionMember, idleClock).clock).toBe(idleClock);
  });

  it("does not carry over unexpected fields", () => {
    const result = toGameMember(sessionMember, idleClock);
    expect(Object.keys(result)).toEqual(["id", "name", "wins", "isConnected", "clock"]);
  });
});

describe("toPostGameMember", () => {
  it("copies all GameMember fields", () => {
    const result = toPostGameMember(gameMember);
    expect(result.id).toBe(gameMember.id);
    expect(result.name).toBe(gameMember.name);
    expect(result.isConnected).toBe(gameMember.isConnected);
    expect(result.wins).toBe(gameMember.wins);
  });

  it("preserves clock", () => {
    expect(toPostGameMember(gameMember).clock).toBe(idleClock);
  });

  it("does not carry over unexpected fields", () => {
    const result = toPostGameMember(gameMember);
    expect(Object.keys(result)).toEqual(["id", "name", "wins", "isConnected", "clock"]);
  });
});
