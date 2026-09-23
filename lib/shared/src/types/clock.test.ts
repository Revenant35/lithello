import { ActiveClockSchema, ClockSchema, IdleClockSchema } from "./clock.ts";

const VALID_DATETIME = "2026-09-23T08:00:00.000Z";

// ---------------------------------------------------------------------------
// IdleClockSchema
// ---------------------------------------------------------------------------

describe("IdleClockSchema", () => {
  it("accepts a valid idle clock", () => {
    expect(IdleClockSchema.safeParse({ kind: "idle", clockTimeMilliseconds: 300000 }).success).toBe(true);
  });

  it("accepts zero milliseconds", () => {
    expect(IdleClockSchema.safeParse({ kind: "idle", clockTimeMilliseconds: 0 }).success).toBe(true);
  });

  it("rejects a missing clockTimeMilliseconds", () => {
    expect(IdleClockSchema.safeParse({ kind: "idle" }).success).toBe(false);
  });

  it("rejects a negative clockTimeMilliseconds", () => {
    expect(IdleClockSchema.safeParse({ kind: "idle", clockTimeMilliseconds: -1 }).success).toBe(false);
  });

  it("rejects a non-integer clockTimeMilliseconds", () => {
    expect(IdleClockSchema.safeParse({ kind: "idle", clockTimeMilliseconds: 1.5 }).success).toBe(false);
  });

  it("rejects the wrong kind", () => {
    expect(IdleClockSchema.safeParse({ kind: "active", clockTimeMilliseconds: 300000 }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ActiveClockSchema
// ---------------------------------------------------------------------------

describe("ActiveClockSchema", () => {
  it("accepts a valid active clock", () => {
    expect(ActiveClockSchema.safeParse({ kind: "active", expiresAt: VALID_DATETIME }).success).toBe(true);
  });

  it("rejects a missing expiresAt", () => {
    expect(ActiveClockSchema.safeParse({ kind: "active" }).success).toBe(false);
  });

  it("rejects a non-ISO expiresAt", () => {
    expect(ActiveClockSchema.safeParse({ kind: "active", expiresAt: "not-a-date" }).success).toBe(false);
  });

  it("rejects the wrong kind", () => {
    expect(ActiveClockSchema.safeParse({ kind: "idle", expiresAt: VALID_DATETIME }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ClockSchema (discriminated union)
// ---------------------------------------------------------------------------

describe("ClockSchema", () => {
  it("accepts an idle clock", () => {
    expect(ClockSchema.safeParse({ kind: "idle", clockTimeMilliseconds: 300000 }).success).toBe(true);
  });

  it("accepts an active clock", () => {
    expect(ClockSchema.safeParse({ kind: "active", expiresAt: VALID_DATETIME }).success).toBe(true);
  });

  it("rejects an unknown kind", () => {
    expect(ClockSchema.safeParse({ kind: "paused", clockTimeMilliseconds: 300000 }).success).toBe(false);
  });

  it("rejects a missing kind", () => {
    expect(ClockSchema.safeParse({ clockTimeMilliseconds: 300000 }).success).toBe(false);
  });
});
