import {
  GameMemberSchema,
  LobbyMemberSchema,
  PostGameMemberSchema,
  SessionMemberSchema,
} from "./member.ts";

const VALID_UUID = "00000000-0000-4000-8000-000000000000";

const validSessionMember = {
  id: VALID_UUID,
  name: "Alice",
  isConnected: true,
  wins: 0,
};

describe("SessionMemberSchema", () => {
  it("accepts a valid session member", () => {
    expect(SessionMemberSchema.safeParse(validSessionMember).success).toBe(true);
  });

  it("rejects a non-UUID id", () => {
    expect(SessionMemberSchema.safeParse({ ...validSessionMember, id: "not-a-uuid" }).success).toBe(
      false,
    );
  });

  it("rejects a missing name", () => {
    const { name: _, ...rest } = validSessionMember;
    expect(SessionMemberSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a non-boolean isConnected", () => {
    expect(
      SessionMemberSchema.safeParse({ ...validSessionMember, isConnected: 1 }).success,
    ).toBe(false);
  });

  it("rejects a non-number wins", () => {
    expect(
      SessionMemberSchema.safeParse({ ...validSessionMember, wins: "0" }).success,
    ).toBe(false);
  });

  it("rejects negative wins", () => {
    expect(
      SessionMemberSchema.safeParse({ ...validSessionMember, wins: -1 }).success,
    ).toBe(false);
  });
});

describe("LobbyMemberSchema", () => {
  it("accepts a valid lobby member", () => {
    expect(LobbyMemberSchema.safeParse({ ...validSessionMember, isReady: false }).success).toBe(
      true,
    );
  });

  it("rejects a missing isReady field", () => {
    expect(LobbyMemberSchema.safeParse(validSessionMember).success).toBe(false);
  });

  it("rejects a non-boolean isReady", () => {
    expect(
      LobbyMemberSchema.safeParse({ ...validSessionMember, isReady: "yes" }).success,
    ).toBe(false);
  });
});

describe("GameMemberSchema", () => {
  it("accepts a valid game member", () => {
    expect(
      GameMemberSchema.safeParse({ ...validSessionMember, isOfferingDraw: false }).success,
    ).toBe(true);
  });

  it("rejects a missing isOfferingDraw field", () => {
    expect(GameMemberSchema.safeParse(validSessionMember).success).toBe(false);
  });

  it("rejects a non-boolean isOfferingDraw", () => {
    expect(
      GameMemberSchema.safeParse({ ...validSessionMember, isOfferingDraw: 0 }).success,
    ).toBe(false);
  });
});

describe("PostGameMemberSchema", () => {
  it("accepts a valid post-game member", () => {
    expect(
      PostGameMemberSchema.safeParse({ ...validSessionMember, isRequestingRematch: false }).success,
    ).toBe(true);
  });

  it("rejects a missing isRequestingRematch field", () => {
    expect(PostGameMemberSchema.safeParse(validSessionMember).success).toBe(false);
  });

  it("rejects a non-boolean isRequestingRematch", () => {
    expect(
      PostGameMemberSchema.safeParse({ ...validSessionMember, isRequestingRematch: null }).success,
    ).toBe(false);
  });
});
