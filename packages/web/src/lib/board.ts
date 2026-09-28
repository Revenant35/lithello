import type { BoardLocation } from '@lithello/shared';

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

export function formatBoardLocation(location: BoardLocation): string {
  return `${FILES[location.col]}${RANKS[location.row]}`.toUpperCase();
}
