import {
  BOARD_AREA,
  BOARD_SIZE,
  BoardLocationSchema,
  BoardSchema,
  BoardCellColorSchema,
  GameScoreSchema,
  INITIAL_BOARD,
  PlayerColorSchema,
  PlayerScoreSchema,
} from "./board.ts";

describe("PlayerColorSchema", () => {
  it.each(["w", "b"])("accepts %s", (color) => {
    expect(PlayerColorSchema.safeParse(color).success).toBe(true);
  });

  it.each(["W", "B", "", "white", "black", null, 0])("rejects %s", (value) => {
    expect(PlayerColorSchema.safeParse(value).success).toBe(false);
  });
});

describe("BoardCellColorSchema", () => {
  it.each(["w", "b", null])("accepts %s", (value) => {
    expect(BoardCellColorSchema.safeParse(value).success).toBe(true);
  });

  it.each(["W", "B", "", undefined])("rejects %s", (value) => {
    expect(BoardCellColorSchema.safeParse(value).success).toBe(false);
  });
});

describe("PlayerScoreSchema", () => {
  it.each([0, 1, BOARD_AREA])("accepts %i", (score) => {
    expect(PlayerScoreSchema.safeParse(score).success).toBe(true);
  });

  it.each([-1, BOARD_AREA + 1, 1.5, NaN, "0"])("rejects %s", (value) => {
    expect(PlayerScoreSchema.safeParse(value).success).toBe(false);
  });
});

describe("GameScoreSchema", () => {
  it("accepts a valid score where totals are within BOARD_AREA", () => {
    expect(GameScoreSchema.safeParse({ w: 32, b: 32 }).success).toBe(true);
    expect(GameScoreSchema.safeParse({ w: 0, b: 0 }).success).toBe(true);
    expect(GameScoreSchema.safeParse({ w: BOARD_AREA, b: 0 }).success).toBe(true);
  });

  it("rejects a score where the total exceeds BOARD_AREA", () => {
    expect(GameScoreSchema.safeParse({ w: BOARD_AREA, b: 1 }).success).toBe(false);
  });

  it("rejects negative scores", () => {
    expect(GameScoreSchema.safeParse({ w: -1, b: 0 }).success).toBe(false);
  });

  it("rejects non-integer scores", () => {
    expect(GameScoreSchema.safeParse({ w: 1.5, b: 0 }).success).toBe(false);
  });
});

describe("BoardLocationSchema", () => {
  it.each([
    { row: 0, col: 0 },
    { row: BOARD_SIZE - 1, col: BOARD_SIZE - 1 },
    { row: 3, col: 4 },
  ])("accepts %o", (location) => {
    expect(BoardLocationSchema.safeParse(location).success).toBe(true);
  });

  it.each([
    { row: -1, col: 0 },
    { row: 0, col: -1 },
    { row: BOARD_SIZE, col: 0 },
    { row: 0, col: BOARD_SIZE },
    { row: 1.5, col: 0 },
    { row: 0 },
    {},
  ])("rejects %o", (location) => {
    expect(BoardLocationSchema.safeParse(location).success).toBe(false);
  });
});

describe("BoardSchema", () => {
  it("accepts the initial board", () => {
    expect(BoardSchema.safeParse(INITIAL_BOARD).success).toBe(true);
  });

  it("accepts a fully-populated board", () => {
    const full = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill("w"));
    expect(BoardSchema.safeParse(full).success).toBe(true);
  });

  it("rejects a board with too few rows", () => {
    const short = INITIAL_BOARD.slice(0, BOARD_SIZE - 1);
    expect(BoardSchema.safeParse(short).success).toBe(false);
  });

  it("rejects a board with too many rows", () => {
    const tall = [...INITIAL_BOARD, Array(BOARD_SIZE).fill(null)];
    expect(BoardSchema.safeParse(tall).success).toBe(false);
  });

  it("rejects a board where a row has too few columns", () => {
    const bad = INITIAL_BOARD.map((row, i) => (i === 3 ? row.slice(0, BOARD_SIZE - 1) : row));
    expect(BoardSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a board with an invalid cell value", () => {
    const bad = structuredClone(INITIAL_BOARD);
    (bad[0] as unknown[])[0] = "x";
    expect(BoardSchema.safeParse(bad).success).toBe(false);
  });
});
