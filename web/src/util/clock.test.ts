import { describe, expect, it } from "vitest";
import { formatClockTime } from "./clock.ts";

describe("formatClockTime", () => {
  // -------------------------------------------------------------------------
  // HH:MM — 1 hour or more
  // -------------------------------------------------------------------------

  it("formats exactly 1 hour as 1:00", () => {
    expect(formatClockTime(60 * 60 * 1000)).toBe("1:00");
  });

  it("formats 1 hour 5 minutes as 1:05", () => {
    expect(formatClockTime((60 * 60 + 5 * 60) * 1000)).toBe("1:05");
  });

  it("formats 2 hours 30 minutes as 2:30", () => {
    expect(formatClockTime((2 * 60 * 60 + 30 * 60) * 1000)).toBe("2:30");
  });

  it("ignores seconds in HH:MM format", () => {
    expect(formatClockTime((60 * 60 + 5 * 60 + 45) * 1000)).toBe("1:05");
  });

  // -------------------------------------------------------------------------
  // MM:SS — 1 minute or more, less than 1 hour
  // -------------------------------------------------------------------------

  it("formats exactly 1 minute as 01:00", () => {
    expect(formatClockTime(60 * 1000)).toBe("01:00");
  });

  it("formats 4 minutes 32 seconds as 04:32", () => {
    expect(formatClockTime((4 * 60 + 32) * 1000)).toBe("04:32");
  });

  it("formats 59 minutes 59 seconds as 59:59", () => {
    expect(formatClockTime((59 * 60 + 59) * 1000)).toBe("59:59");
  });

  it("pads single-digit minutes with a leading zero", () => {
    expect(formatClockTime((5 * 60 + 3) * 1000)).toBe("05:03");
  });

  it("ignores sub-second precision in MM:SS format", () => {
    expect(formatClockTime((4 * 60 + 32) * 1000 + 999)).toBe("04:32");
  });

  // -------------------------------------------------------------------------
  // SS.ss — under 1 minute
  // -------------------------------------------------------------------------

  it("formats exactly 0ms as 00.00", () => {
    expect(formatClockTime(0)).toBe("00.00");
  });

  it("formats 12 seconds 70ms as 12.07", () => {
    expect(formatClockTime(12 * 1000 + 70)).toBe("12.07");
  });

  it("formats 59 seconds 990ms as 59.99", () => {
    expect(formatClockTime(59 * 1000 + 990)).toBe("59.99");
  });

  it("pads single-digit seconds with a leading zero", () => {
    expect(formatClockTime(7 * 1000 + 500)).toBe("07.50");
  });

  it("pads single-digit hundredths with a leading zero", () => {
    expect(formatClockTime(3 * 1000 + 40)).toBe("03.04");
  });

  it("floors hundredths rather than rounding", () => {
    // 999ms → 99 hundredths, not 100
    expect(formatClockTime(999)).toBe("00.99");
  });
});
