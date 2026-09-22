import { err, ok } from "neverthrow";
import { type Board, BOARD_SIZE, BoardError, INITIAL_BOARD } from "../types/board.ts";
import {
  getGameScore,
  getOpponentColor,
  getPlayerScore,
  getValidMoveLocations,
  isMoveValid,
  performMove,
} from "./board.ts";

describe("getPlayerScore", () => {
  it("returns 2 for each color on the initial board", () => {
    expect(getPlayerScore(INITIAL_BOARD, "w")).toBe(2);
    expect(getPlayerScore(INITIAL_BOARD, "b")).toBe(2);
  });

  it("returns 0 when the board has no pieces for the player", () => {
    const emptyBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
    expect(getPlayerScore(emptyBoard, "w")).toBe(0);
    expect(getPlayerScore(emptyBoard, "b")).toBe(0);
  });

  it("counts only the requested player's pieces", () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[0][0] = "w";
    board[0][1] = "w";
    board[1][0] = "b";
    expect(getPlayerScore(board, "w")).toBe(2);
    expect(getPlayerScore(board, "b")).toBe(1);
  });

  it("returns 64 when the entire board belongs to one player", () => {
    const fullBoard = Array.from({ length: 8 }, () => Array(8).fill("w"));
    expect(getPlayerScore(fullBoard, "w")).toBe(64);
    expect(getPlayerScore(fullBoard, "b")).toBe(0);
  });
});

describe("getGameScore", () => {
  it("returns { w: 2, b: 2 } for the initial board", () => {
    expect(getGameScore(INITIAL_BOARD)).toEqual({ w: 2, b: 2 });
  });

  it("returns { w: 0, b: 0 } for an empty board", () => {
    const emptyBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
    expect(getGameScore(emptyBoard)).toEqual({ w: 0, b: 0 });
  });

  it("returns correct totals when one player dominates", () => {
    const fullBoard = Array.from({ length: 8 }, () => Array(8).fill("w"));
    expect(getGameScore(fullBoard)).toEqual({ w: 64, b: 0 });
  });

  it("scores sum to the total number of pieces on the board", () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[0][0] = "w";
    board[0][1] = "b";
    board[0][2] = "b";
    const score = getGameScore(board);
    expect(score.w + score.b).toBe(3);
  });
});

describe("getValidMoveLocations", () => {
  it("returns 4 valid moves for white on the initial board", () => {
    const moves = getValidMoveLocations(INITIAL_BOARD, "w");
    expect(moves).toHaveLength(4);
    expect(moves).toEqual(
      expect.arrayContaining([
        { row: 2, col: 4 },
        { row: 3, col: 5 },
        { row: 4, col: 2 },
        { row: 5, col: 3 },
      ]),
    );
  });

  it("returns 4 valid moves for black on the initial board", () => {
    const moves = getValidMoveLocations(INITIAL_BOARD, "b");
    expect(moves).toHaveLength(4);
    expect(moves).toEqual(
      expect.arrayContaining([
        { row: 2, col: 3 },
        { row: 3, col: 2 },
        { row: 4, col: 5 },
        { row: 5, col: 4 },
      ]),
    );
  });

  it("returns no moves on an empty board", () => {
    const emptyBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
    expect(getValidMoveLocations(emptyBoard, "w")).toHaveLength(0);
    expect(getValidMoveLocations(emptyBoard, "b")).toHaveLength(0);
  });

  it("returns no moves when the board is full", () => {
    const fullBoard = Array.from({ length: 8 }, () => Array(8).fill("w"));
    expect(getValidMoveLocations(fullBoard, "w")).toHaveLength(0);
    expect(getValidMoveLocations(fullBoard, "b")).toHaveLength(0);
  });

  it("does not include occupied cells as valid moves", () => {
    const moves = getValidMoveLocations(INITIAL_BOARD, "w");
    const occupied = [
      { row: 3, col: 3 },
      { row: 3, col: 4 },
      { row: 4, col: 3 },
      { row: 4, col: 4 },
    ];
    for (const cell of occupied) {
      expect(moves).not.toEqual(expect.arrayContaining([cell]));
    }
  });
});

describe("isMoveValid", () => {
  // On the initial board, (2,4) is a valid move for white: it flanks the black
  // piece at (3,4) with the white piece at (4,4) along the vertical axis.
  it("returns true for a valid move on the initial board", () => {
    expect(isMoveValid(INITIAL_BOARD, { row: 2, col: 4 }, "w")).toBe(true);
    expect(isMoveValid(INITIAL_BOARD, { row: 2, col: 3 }, "b")).toBe(true);
  });

  it("returns false for a move onto an occupied cell", () => {
    expect(isMoveValid(INITIAL_BOARD, { row: 3, col: 3 }, "w")).toBe(false);
    expect(isMoveValid(INITIAL_BOARD, { row: 4, col: 4 }, "b")).toBe(false);
  });

  it("returns false for an empty cell that flanks nothing", () => {
    expect(isMoveValid(INITIAL_BOARD, { row: 0, col: 0 }, "w")).toBe(false);
    expect(isMoveValid(INITIAL_BOARD, { row: 7, col: 7 }, "b")).toBe(false);
  });

  it("returns false on an empty board", () => {
    const emptyBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
    expect(isMoveValid(emptyBoard, { row: 3, col: 3 }, "w")).toBe(false);
  });

  it("returns false when placing adjacent to own piece with no opponent in between", () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[3][3] = "w";
    expect(isMoveValid(board, { row: 3, col: 4 }, "w")).toBe(false);
  });
});

describe("performMove", () => {
  it.each([
    { playerColor: "w", col: 4 },
    { playerColor: "b", col: 3 },
  ] as const)(
    "places and flips pieces for $playerColor without mutating the board",
    ({ playerColor, col }) => {
      const board = INITIAL_BOARD.map((row) => [...row]);
      const original = structuredClone(board);
      const expected = structuredClone(board);
      expected[2][col] = playerColor;
      expected[3][col] = playerColor;

      const result = performMove(board, { row: 2, col }, playerColor);

      assert(result.isOk(), "Expected the move to succeed");
      expect(result.value).toEqual(expected);
      expect(board).toEqual(original);
      expect(result.value).not.toBe(board);
      for (let row = 0; row < BOARD_SIZE; row++) {
        expect(result.value[row]).not.toBe(board[row]);
      }
    },
  );

  it("flips bracketed pieces in all eight directions in one move", () => {
    const board: Board = [
      [null, null, null, null, null, null, null, null],
      [null, "w", null, "w", null, "w", null, null],
      [null, null, "b", "b", "b", null, null, null],
      [null, "w", "b", null, "b", "w", null, null],
      [null, null, "b", "b", "b", null, null, null],
      [null, "w", null, "w", null, "w", null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
    ];
    const expected: Board = [
      [null, null, null, null, null, null, null, null],
      [null, "w", null, "w", null, "w", null, null],
      [null, null, "w", "w", "w", null, null, null],
      [null, "w", "w", "w", "w", "w", null, null],
      [null, null, "w", "w", "w", null, null, null],
      [null, "w", null, "w", null, "w", null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
    ];

    const result = performMove(board, { row: 3, col: 3 }, "w");
    assert(result.isOk(), "Expected the move to succeed");
    expect(result.value).toEqual(expected);
  });

  it("flips a chain at a corner but leaves chains ending at a gap or board edge unchanged", () => {
    const board: Board = Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => null),
    );
    board[0][1] = "b";
    board[0][2] = "b";
    board[0][3] = "w";
    // A gap at (2,0) prevents a vertical capture.
    board[1][0] = "b";
    board[3][0] = "w";
    // The diagonal reaches the edge without a white piece to bracket it.
    for (let index = 1; index < BOARD_SIZE; index++) {
      board[index][index] = "b";
    }
    const expected = structuredClone(board);
    expected[0][0] = "w";
    expected[0][1] = "w";
    expected[0][2] = "w";

    expect(performMove(board, { row: 0, col: 0 }, "w")).toEqual(ok(expected));
  });

  it.each([
    { row: 3, col: 3 },
    { row: 3, col: 4 },
    { row: 0, col: 0 },
    { row: -1, col: 0 },
    { row: BOARD_SIZE, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: BOARD_SIZE },
  ])(
    "returns an error without mutating the board for an illegal move at ($row, $col)",
    (location) => {
      const board = INITIAL_BOARD.map((row) => [...row]);
      const original = structuredClone(board);

      expect(performMove(board, location, "w")).toEqual(err(BoardError.ILLEGAL_MOVE));
      expect(board).toEqual(original);
    },
  );
});

describe("getOpponentColor", () => {
  it("returns black for white", () => {
    expect(getOpponentColor("w")).toBe("b");
  });

  it("returns white for black", () => {
    expect(getOpponentColor("b")).toBe("w");
  });
});
