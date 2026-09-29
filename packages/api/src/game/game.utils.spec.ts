import { type GameBoard, getBoardScore, INITIAL_BOARD, type PlayerColor, type Square } from '@lithello/shared';
import {
  applyMove,
  getColorForPly,
  getLegalMoves,
  getOpponentColor,
  getWinner,
  hasLegalMove,
  isGameOver,
  isLegalMove,
} from './game.utils.ts';

/**
 * Builds a board from an 8x8 diagram so positions are readable. Rows run top to
 * bottom (rank 1 to rank 8), columns left to right (file a to file h), matching
 * the row-major square numbering the engine uses.
 */
function board(diagram: string): GameBoard {
  const rows = diagram
    .split('\n')
    .map((row) => row.trim())
    .filter((row) => row.length > 0);

  if (rows.length !== 8 || rows.some((row) => row.length !== 8)) {
    throw new Error('A board diagram must be 8 rows of 8 characters');
  }

  let whitePieces = 0n;
  let blackPieces = 0n;

  rows.forEach((row, rowIndex) => {
    [...row].forEach((cell, colIndex) => {
      const bit = 1n << BigInt(rowIndex * 8 + colIndex);

      if (cell === 'w') whitePieces |= bit;
      if (cell === 'b') blackPieces |= bit;
    });
  });

  return {
    whitePieces: BigInt.asIntN(64, whitePieces),
    blackPieces: BigInt.asIntN(64, blackPieces),
  };
}

/** 'd3' -> 19 */
function square(name: string): Square {
  const col = name.charCodeAt(0) - 'a'.charCodeAt(0);
  const row = Number(name[1]) - 1;

  return row * 8 + col;
}

function squareName(value: Square): string {
  return `${'abcdefgh'[value % 8]}${Math.floor(value / 8) + 1}`;
}

function names(squares: Square[]): string[] {
  return squares.map(squareName);
}

describe('getOpponentColor', () => {
  it('swaps colour', () => {
    expect(getOpponentColor('w')).toBe('b');
    expect(getOpponentColor('b')).toBe('w');
  });
});

describe('getColorForPly', () => {
  // Ply 0 is the initial position rather than a move, so black opens on ply 1.
  it('gives black the odd plies, because black moves first', () => {
    expect(getColorForPly(1)).toBe('b');
    expect(getColorForPly(3)).toBe('b');
    expect(getColorForPly(2)).toBe('w');
    expect(getColorForPly(4)).toBe('w');
  });
});

describe('the board helper', () => {
  it('reproduces the opening position', () => {
    expect(
      board(`
        ........
        ........
        ........
        ...wb...
        ...bw...
        ........
        ........
        ........
      `),
    ).toEqual(INITIAL_BOARD);
  });
});

describe('getLegalMoves', () => {
  it('finds the four opening moves for black', () => {
    expect(names(getLegalMoves(INITIAL_BOARD, 'b'))).toEqual([
      'd3',
      'c4',
      'f5',
      'e6',
    ]);
  });

  it('finds the four opening moves for white', () => {
    expect(names(getLegalMoves(INITIAL_BOARD, 'w'))).toEqual([
      'e3',
      'f4',
      'c5',
      'd6',
    ]);
  });

  it('returns nothing on an empty board', () => {
    const empty = board(`
      ........
      ........
      ........
      ........
      ........
      ........
      ........
      ........
    `);

    expect(getLegalMoves(empty, 'b')).toEqual([]);
    expect(hasLegalMove(empty, 'w')).toBe(false);
  });

  it('will not close a run that runs off the board', () => {
    // Nothing anchors the run, so h4 is not playable for black.
    const position = board(`
      ........
      ........
      ........
      .....bww
      ........
      ........
      ........
      ........
    `);

    expect(getLegalMoves(position, 'b')).toEqual([]);
  });

  it('does not wrap across the h and a files', () => {
    // h4 and a5 are adjacent by square index but not on the board, so neither
    // colour can use the other to close a run.
    const position = board(`
      ........
      ........
      ........
      .......b
      w.......
      ........
      ........
      ........
    `);

    expect(getLegalMoves(position, 'b')).toEqual([]);
    expect(getLegalMoves(position, 'w')).toEqual([]);
  });

  it('finds a move across a long run', () => {
    const position = board(`
      bwwwwww.
      ........
      ........
      ........
      ........
      ........
      ........
      ........
    `);

    expect(names(getLegalMoves(position, 'b'))).toEqual(['h1']);
  });
});

describe('isLegalMove', () => {
  it('accepts an opening move and rejects an occupied or empty-anchored one', () => {
    expect(isLegalMove(INITIAL_BOARD, 'b', square('d3'))).toBe(true);
    expect(isLegalMove(INITIAL_BOARD, 'b', square('d4'))).toBe(false);
    expect(isLegalMove(INITIAL_BOARD, 'b', square('a1'))).toBe(false);
  });

  it('rejects a move that belongs to the other colour', () => {
    expect(isLegalMove(INITIAL_BOARD, 'w', square('d3'))).toBe(false);
  });
});

describe('applyMove', () => {
  it('places the disc and flips the run it closes', () => {
    const next = applyMove(INITIAL_BOARD, 'b', square('d3'));

    expect(next).toEqual(
      board(`
        ........
        ........
        ...b....
        ...bb...
        ...bw...
        ........
        ........
        ........
      `),
    );
    expect(getBoardScore(next)).toEqual({ white: 1, black: 4 });
  });

  it('flips in all eight directions at once', () => {
    // Every neighbour of d4 is white, and every one of those is backed by a
    // black disc, so playing d4 closes a run in all eight directions.
    const position = board(`
      ........
      .b.b.b..
      ..www...
      .bw.wb..
      ..www...
      .b.b.b..
      ........
      ........
    `);

    expect(getBoardScore(position)).toEqual({ white: 8, black: 8 });

    const next = applyMove(position, 'b', square('d4'));

    expect(getBoardScore(next)).toEqual({ white: 0, black: 17 });
  });

  it('does not mutate the board it is given', () => {
    const before = { ...INITIAL_BOARD };

    applyMove(INITIAL_BOARD, 'b', square('d3'));

    expect(INITIAL_BOARD).toEqual(before);
  });

  it('keeps the two bitboards disjoint', () => {
    const next = applyMove(INITIAL_BOARD, 'b', square('d3'));

    expect(next.whitePieces & next.blackPieces).toBe(0n);
  });

  it('refuses an occupied square', () => {
    expect(() => applyMove(INITIAL_BOARD, 'b', square('d4'))).toThrow(
      /already occupied/,
    );
  });

  it('refuses a move that flips nothing', () => {
    expect(() => applyMove(INITIAL_BOARD, 'b', square('a1'))).toThrow(
      /flips nothing/,
    );
  });

  it('handles a piece on the last square, which is a negative bitboard', () => {
    const position = board(`
      ........
      ........
      ........
      ........
      ........
      ........
      ........
      .....bw.
    `);

    const next = applyMove(position, 'b', square('h8'));

    // h8 is bit 63, so the signed value is negative - the engine works on the
    // unsigned view and converts back.
    expect(next.blackPieces).toBeLessThan(0n);
    expect(getBoardScore(next)).toEqual({ white: 0, black: 3 });
  });
});

describe('isGameOver', () => {
  it('is false at the opening', () => {
    expect(isGameOver(INITIAL_BOARD)).toBe(false);
  });

  it('is true when neither colour can move', () => {
    const full = board(`
      wwwwwwww
      wwwwwwww
      wwwwwwww
      wwwwwwww
      wwwwwwww
      wwwwwwww
      wwwwwwww
      wwwwwwww
    `);

    expect(isGameOver(full)).toBe(true);
  });

  it('is true for a board nobody can play into', () => {
    const isolated = board(`
      w.......
      ........
      ........
      ........
      ........
      ........
      ........
      .......b
    `);

    expect(isGameOver(isolated)).toBe(true);
  });
});

describe('getWinner', () => {
  it('reads the result off the piece counts', () => {
    expect(
      getWinner(board(`
        ww......
        ........
        ........
        ........
        ........
        ........
        ........
        .......b
      `)),
    ).toBe('white_win');

    expect(
      getWinner(board(`
        w.......
        ........
        ........
        ........
        ........
        ........
        ........
        ......bb
      `)),
    ).toBe('black_win');

    expect(getWinner(INITIAL_BOARD)).toBe('draw');
  });
});

/**
 * Node counts from the opening position are published for Othello, so matching
 * them exercises move generation, flipping and pass handling together across
 * thousands of distinct positions.
 */
describe('perft', () => {
  function perft(
    position: GameBoard,
    color: PlayerColor,
    depth: number,
    opponentPassed = false,
  ): number {
    const moves = getLegalMoves(position, color);

    if (moves.length === 0) {
      return opponentPassed
        ? 1
        : perft(position, getOpponentColor(color), depth, true);
    }

    if (depth === 0) {
      return 1;
    }

    return moves.reduce(
      (nodes, move) =>
        nodes +
        perft(
          applyMove(position, color, move),
          getOpponentColor(color),
          depth - 1,
        ),
      0,
    );
  }

  it.each([
    [1, 4],
    [2, 12],
    [3, 56],
    [4, 244],
    [5, 1396],
    [6, 8200],
  ])('matches the published node count at depth %i', (depth, expected) => {
    expect(perft(INITIAL_BOARD, 'b', depth)).toBe(expected);
  });
});

describe('random playouts', () => {
  it('holds every invariant across full games', () => {
    const pieceCount = (bits: bigint) =>
      [...Array(64).keys()].filter(
        (index) => (BigInt.asUintN(64, bits) >> BigInt(index)) & 1n,
      ).length;

    for (let game = 0; game < 50; game++) {
      let position = INITIAL_BOARD;
      let color: PlayerColor = 'b';
      let guard = 0;

      while (!isGameOver(position)) {
        expect(guard++).toBeLessThan(200);

        const moves = getLegalMoves(position, color);

        if (moves.length === 0) {
          color = getOpponentColor(color);
          continue;
        }

        const before =
          pieceCount(position.whitePieces) + pieceCount(position.blackPieces);
        const mine = pieceCount(
          color === 'w' ? position.whitePieces : position.blackPieces,
        );

        const next = applyMove(
          position,
          color,
          moves[Math.floor(Math.random() * moves.length)]!,
        );

        const after =
          pieceCount(next.whitePieces) + pieceCount(next.blackPieces);

        expect(next.whitePieces & next.blackPieces).toBe(0n);
        expect(after).toBe(before + 1);
        expect(after).toBeLessThanOrEqual(64);
        expect(
          pieceCount(color === 'w' ? next.whitePieces : next.blackPieces),
        ).toBeGreaterThan(mine);

        position = next;
        color = getOpponentColor(color);
      }

      expect(['white_win', 'black_win', 'draw']).toContain(getWinner(position));
    }
  });
});
