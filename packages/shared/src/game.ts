import { z } from 'zod';
import {
  BitboardCodec,
  BOARD_SQUARES,
  type GameBoard,
  getBoardScore,
  type Square,
} from './game-board.ts';
import { GamePlayerSchema, type PlayerColor } from './game-player.ts';
import { GameTimeControlSchema } from './game-time-control.ts';
import { GameIDSchema } from './identifiers.ts';

export const GameResultSchema = z.enum(['white_win', 'black_win', 'draw']);
export type GameResult = z.infer<typeof GameResultSchema>;

export const GameEndReasonSchema = z.enum(['normal', 'resignation', 'timeout']);
export type GameEndReason = z.infer<typeof GameEndReasonSchema>;

export const GameSchema = z.object({
  id: GameIDSchema,
  timeControl: GameTimeControlSchema,
  // gameId is redundant on a seat nested inside its own game.
  white: GamePlayerSchema.omit({ gameId: true }),
  black: GamePlayerSchema.omit({ gameId: true }),
  isRated: z.boolean(),
  createdAt: z.coerce.date(),
  startedAt: z.coerce.date().nullable(),
  endedAt: z.coerce.date().nullable(),
  result: GameResultSchema.nullable(),
  endReason: GameEndReasonSchema.nullable(),
  finalWhitePieces: BitboardCodec.nullable(),
  finalBlackPieces: BitboardCodec.nullable(),
});
export type Game = z.infer<typeof GameSchema>;

export function hasStarted(game: Game): boolean {
  return game.startedAt !== null;
}

export function hasEnded(game: Game): boolean {
  return game.endedAt !== null;
}

/**
 * Othello rules over bitboards. Shared so the server and the client reach the
 * same verdict about legality, whose turn it is, and who won.
 *
 * Squares are row-major, so square = row * 8 + col and bit n is square n.
 * Bitboards are stored as signed int8 values, so everything here works on the
 * unsigned view and converts back on the way out.
 */

const FULL_BOARD = (1n << 64n) - 1n;

/** Column 0 and column 7 - the squares an east/west shift can wrap across. */
const FILE_A = 0x0101010101010101n;
const FILE_H = 0x8080808080808080n;
const NOT_FILE_A = FULL_BOARD ^ FILE_A;
const NOT_FILE_H = FULL_BOARD ^ FILE_H;

/**
 * A shift lands on the wrong row when it crosses a file boundary, so each
 * horizontal direction masks the squares it must not land on.
 */
const DIRECTIONS: ((bits: bigint) => bigint)[] = [
  (b) => (b << 8n) & FULL_BOARD, // south
  (b) => b >> 8n, // north
  (b) => (b << 1n) & NOT_FILE_A, // east
  (b) => (b >> 1n) & NOT_FILE_H, // west
  (b) => (b << 9n) & NOT_FILE_A, // south-east
  (b) => (b << 7n) & NOT_FILE_H, // south-west
  (b) => (b >> 7n) & NOT_FILE_A, // north-east
  (b) => (b >> 9n) & NOT_FILE_H, // north-west
];

function toUnsigned(bits: bigint): bigint {
  return BigInt.asUintN(64, bits);
}

function toSigned(bits: bigint): bigint {
  return BigInt.asIntN(64, bits);
}

function split(
  board: GameBoard,
  color: PlayerColor,
): { own: bigint; opponent: bigint } {
  const white = toUnsigned(board.whitePieces);
  const black = toUnsigned(board.blackPieces);

  return color === 'w'
    ? { own: white, opponent: black }
    : { own: black, opponent: white };
}

function join(color: PlayerColor, own: bigint, opponent: bigint): GameBoard {
  return color === 'w'
    ? { whitePieces: toSigned(own), blackPieces: toSigned(opponent) }
    : { whitePieces: toSigned(opponent), blackPieces: toSigned(own) };
}

function toSquares(bits: bigint): Square[] {
  const squares: Square[] = [];

  for (let square = 0; square < BOARD_SQUARES; square++) {
    if ((bits >> BigInt(square)) & 1n) {
      squares.push(square);
    }
  }

  return squares;
}

/**
 * Walks outward from `origin` collecting an unbroken run of opponent pieces.
 * Returns them only if the run is closed by one of `own` - an open-ended run
 * flips nothing.
 */
function getFlipsInDirection(
  origin: bigint,
  own: bigint,
  opponent: bigint,
  shift: (bits: bigint) => bigint,
): bigint {
  let run = 0n;
  let cursor = shift(origin) & opponent;

  while (cursor !== 0n) {
    run |= cursor;

    const next = shift(cursor);

    if ((next & own) !== 0n) {
      return run;
    }

    cursor = next & opponent;
  }

  return 0n;
}

export function getOpponentColor(color: PlayerColor): PlayerColor {
  return color === 'w' ? 'b' : 'w';
}

/**
 * Whose turn a ply belongs to. Black moves first and ply 0 is the initial
 * position rather than a move, so black owns the odd plies.
 */
export function getColorForPly(ply: number): PlayerColor {
  return ply % 2 === 1 ? 'b' : 'w';
}

/** Every square `color` may legally play in this position. */
export function getLegalMoves(board: GameBoard, color: PlayerColor): Square[] {
  const { own, opponent } = split(board, color);
  const empty = FULL_BOARD ^ (own | opponent);

  let moves = 0n;

  for (const shift of DIRECTIONS) {
    // Grow a run of opponent pieces away from our own, then the empty square
    // just past it is playable.
    let run = shift(own) & opponent;

    for (let step = 0; step < 5; step++) {
      run |= shift(run) & opponent;
    }

    moves |= shift(run) & empty;
  }

  return toSquares(moves);
}

export function isLegalMove(
  board: GameBoard,
  color: PlayerColor,
  square: Square,
): boolean {
  return getLegalMoves(board, color).includes(square);
}

export function hasLegalMove(board: GameBoard, color: PlayerColor): boolean {
  return getLegalMoves(board, color).length > 0;
}

/** The position after `color` plays `square`, with all flips applied. */
export function applyMove(
  board: GameBoard,
  color: PlayerColor,
  square: Square,
): GameBoard {
  const { own, opponent } = split(board, color);
  const placed = 1n << BigInt(square);

  if ((placed & (own | opponent)) !== 0n) {
    throw new Error(`Square ${square} is already occupied`);
  }

  let flips = 0n;

  for (const shift of DIRECTIONS) {
    flips |= getFlipsInDirection(placed, own, opponent, shift);
  }

  if (flips === 0n) {
    throw new Error(`Playing ${square} flips nothing, so it is not a legal move`);
  }

  return join(color, own | flips | placed, opponent & ~flips);
}

/** A game ends when neither side can move. */
export function isGameOver(board: GameBoard): boolean {
  return !hasLegalMove(board, 'w') && !hasLegalMove(board, 'b');
}

/** Result by piece count. Only meaningful once the game has actually ended. */
export function getWinner(board: GameBoard): GameResult {
  const { white, black } = getBoardScore(board);

  if (white > black) {
    return 'white_win';
  }

  if (black > white) {
    return 'black_win';
  }

  return 'draw';
}
