import {
  formatSquare,
  getSquareColor,
  INITIAL_BOARD,
  type Square,
} from './game-board.ts';

describe('formatSquare', () => {
  it.each([
    [0, 'a1'],
    [7, 'h1'],
    [19, 'd3'],
    [27, 'd4'],
    [36, 'e5'],
    [56, 'a8'],
    [63, 'h8'],
  ] as [Square, string][])('renders %i as %s', (square, expected) => {
    expect(formatSquare(square)).toBe(expected);
  });
});

describe('getSquareColor', () => {
  it('reads the four occupied squares of the opening position', () => {
    expect(getSquareColor(INITIAL_BOARD, 27)).toBe('w'); // d4
    expect(getSquareColor(INITIAL_BOARD, 36)).toBe('w'); // e5
    expect(getSquareColor(INITIAL_BOARD, 28)).toBe('b'); // e4
    expect(getSquareColor(INITIAL_BOARD, 35)).toBe('b'); // d5
  });

  it('returns null for an empty square', () => {
    expect(getSquareColor(INITIAL_BOARD, 0)).toBeNull();
    expect(getSquareColor(INITIAL_BOARD, 19)).toBeNull();
    expect(getSquareColor(INITIAL_BOARD, 63)).toBeNull();
  });

  it('reads the last square, whose bitboard is negative', () => {
    // Bit 63 makes the signed value negative, so a naive comparison misses it.
    const board = {
      whitePieces: BigInt.asIntN(64, 1n << 63n),
      blackPieces: 0n,
    };

    expect(board.whitePieces).toBeLessThan(0n);
    expect(getSquareColor(board, 63)).toBe('w');
    expect(getSquareColor(board, 62)).toBeNull();
  });

  it('agrees with the opening position on every square', () => {
    const occupied = [...Array(64).keys()].filter(
      (square) => getSquareColor(INITIAL_BOARD, square as Square) !== null,
    );

    expect(occupied).toEqual([27, 28, 35, 36]);
  });
});
