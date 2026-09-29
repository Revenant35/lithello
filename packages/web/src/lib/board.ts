import { BOARD_SQUARES, type Square } from '@lithello/shared';

export const BOARD_SIZE = 8;

// Pins the label arrays to the board the engine actually uses.
type BoardLabels = { length: typeof BOARD_SIZE };

export const FILES = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
] as const satisfies BoardLabels;

/**
 * Ranks as they are drawn, top to bottom. Squares are numbered from rank 1
 * upward (square 0 is a1), so the display order is the reverse of the
 * numbering and `squareAt` does the flip.
 */
export const RANKS = [
  '8',
  '7',
  '6',
  '5',
  '4',
  '3',
  '2',
  '1',
] as const satisfies BoardLabels;

/** The square drawn at a grid position, with row 0 being the top rank. */
export function squareAt(row: number, col: number): Square {
  return (BOARD_SIZE - 1 - row) * BOARD_SIZE + col;
}

// A mismatch here would silently draw the wrong board.
if (BOARD_SIZE * BOARD_SIZE !== BOARD_SQUARES) {
  throw new Error('Board labels do not match the shared board size');
}
