import { z } from 'zod';

export const BOARD_SQUARES = 64;

/** A tile index, 0-63 in row-major order. */
export const SquareSchema = z
  .int()
  .min(0)
  .max(BOARD_SQUARES - 1);
export type Square = z.infer<typeof SquareSchema>;

/**
 * A 64-tile bitboard travels as 16 lowercase hex characters.
 *
 * JSON cannot carry a bigint (JSON.stringify throws on one) and a number loses
 * precision above 2^53, so the wire format is hex. Hex rather than a decimal
 * string because Postgres int8 is signed: a piece on the last tile is
 * -9223372036854775808 in decimal but a clean "8000000000000000" here, and
 * every value is the same width.
 */
export const BitboardCodec = z.codec(
  z.string().regex(/^[0-9a-f]{16}$/, 'Expected 16 lowercase hex characters'),
  z.bigint(),
  {
    decode: (hex) => BigInt.asIntN(64, BigInt(`0x${hex}`)),
    encode: (board) => BigInt.asUintN(64, board).toString(16).padStart(16, '0'),
  },
);
export type Bitboard = z.infer<typeof BitboardCodec>;

export function areBitboardsDisjoint(a: Bitboard, b: Bitboard): boolean {
  return (a & b) === 0n;
}

export function countPieces(board: Bitboard): number {
  let count = 0;
  for (let bits = BigInt.asUintN(64, board); bits > 0n; bits >>= 1n) {
    if (bits & 1n) count += 1;
  }
  return count;
}

/**
 * A position: one bitboard per colour. Mirrors the game_move_pieces_disjoint
 * check in the database - a tile cannot hold two colours.
 */
export const GameBoardSchema = z
  .object({
    whitePieces: BitboardCodec,
    blackPieces: BitboardCodec,
  })
  .refine((board) => areBitboardsDisjoint(board.whitePieces, board.blackPieces), {
    message: 'whitePieces and blackPieces must not overlap',
    path: ['whitePieces'],
  });
export type GameBoard = z.infer<typeof GameBoardSchema>;

/**
 * The Othello opening position: white on d4/e5, black on e4/d5. Squares are
 * row-major, so d4 is 27, e4 is 28, d5 is 35 and e5 is 36.
 */
export const INITIAL_BOARD: GameBoard = {
  whitePieces: (1n << 27n) | (1n << 36n),
  blackPieces: (1n << 28n) | (1n << 35n),
};

/** Piece count per colour, i.e. the score. */
export function getBoardScore(board: GameBoard): { white: number; black: number } {
  return {
    white: countPieces(board.whitePieces),
    black: countPieces(board.blackPieces),
  };
}
