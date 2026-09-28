import { BOARD_SIZE, type BoardLocation } from '@lithello/shared';

// Board labels are the client-side source of the board's dimensions, so the
// `satisfies` clauses keep them pinned to the shared size.
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

export function formatBoardLocation(location: BoardLocation): string {
  return `${FILES[location.col]}${RANKS[location.row]}`.toUpperCase();
}
