import { type SessionMember } from "../types/member.ts";
import { toGameMember, toLobbyMember, toPostGameMember } from "./member.ts";

const VALID_UUID = "00000000-0000-4000-8000-000000000000" as SessionMember["id"];

const sessionMember: SessionMember = {
  id: VALID_UUID,
  name: "Alice",
  isConnected: true,
  wins: 3,
};

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
    const result = toGameMember(sessionMember);
    expect(result.id).toBe(sessionMember.id);
    expect(result.name).toBe(sessionMember.name);
    expect(result.isConnected).toBe(sessionMember.isConnected);
    expect(result.wins).toBe(sessionMember.wins);
  });

  it("does not carry over unexpected fields", () => {
    const result = toGameMember(sessionMember);
    expect(Object.keys(result)).toEqual(["id", "name", "wins", "isConnected"]);
  });
});

describe("toPostGameMember", () => {
  it("copies all SessionMember fields", () => {
    const result = toPostGameMember(sessionMember);
    expect(result.id).toBe(sessionMember.id);
    expect(result.name).toBe(sessionMember.name);
    expect(result.isConnected).toBe(sessionMember.isConnected);
    expect(result.wins).toBe(sessionMember.wins);
  });

  it("does not carry over unexpected fields", () => {
    const result = toPostGameMember(sessionMember);
    expect(Object.keys(result)).toEqual(["id", "name", "wins", "isConnected"]);
  });
});
