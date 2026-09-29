import {
  Board,
  BOARD_SIZE,
  BoardCell,
  BoardLocation,
  GameMove,
  GameScore,
  PlayerColor,
  PlayerScore,
} from '@lithello/shared';
import { err, ok, Result } from 'neverthrow';

const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const;

const INITIAL_BOARD: Board = [
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, 'w', 'b', null, null, null],
  [null, null, null, 'b', 'w', null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
];

export enum OthelloServiceError {
  IllegalMove = 'Illegal Move',
}

export function createInitialBoard(): Board {
  return structuredClone(INITIAL_BOARD);
}

export function getPlayerScore(
  board: Board,
  playerColor: PlayerColor,
): PlayerScore {
  return board.reduce(
    (score, row) => score + row.filter((cell) => cell === playerColor).length,
    0,
  );
}

export function getGameScore(board: Board): GameScore {
  return {
    white: getPlayerScore(board, 'w'),
    black: getPlayerScore(board, 'b'),
  };
}

export function getOpponentColor(playerColor: PlayerColor): PlayerColor {
  return playerColor === 'w' ? 'b' : 'w';
}

export function getValidMoveLocations(
  board: Board,
  playerColor: PlayerColor,
): BoardLocation[] {
  const locations: BoardLocation[] = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const location = { row, col };
      if (isMoveValid(board, { location, playerColor })) {
        locations.push(location);
      }
    }
  }

  return locations;
}

export function performMoves(
  board: Board,
  moves: GameMove[],
): Result<Board, OthelloServiceError> {
  let finalBoard = structuredClone(board);
  for (const move of moves) {
    const result = performMove(finalBoard, move);

    if (result.isErr()) {
      return err(OthelloServiceError.IllegalMove);
    }

    finalBoard = result.value;
  }

  return ok(finalBoard);
}

export function performMove(
  board: Board,
  move: GameMove,
): Result<Board, OthelloServiceError> {
  if (!isMoveValid(board, move)) {
    return err(OthelloServiceError.IllegalMove);
  }

  const opponentColor = getOpponentColor(move.playerColor);
  const nextBoard = structuredClone(board);

  for (const [rowDelta, colDelta] of DIRECTIONS) {
    const toFlip: BoardLocation[] = [];

    let nextRow = move.location.row + rowDelta;
    let nextCol = move.location.col + colDelta;

    while (
      isInBounds({ row: nextRow, col: nextCol }) &&
      board[nextRow][nextCol] === opponentColor
    ) {
      toFlip.push({
        row: nextRow,
        col: nextCol,
      });

      nextRow += rowDelta;
      nextCol += colDelta;
    }

    if (
      toFlip.length > 0 &&
      isInBounds({ row: nextRow, col: nextCol }) &&
      board[nextRow][nextCol] === move.playerColor
    ) {
      for (const position of toFlip) {
        nextBoard[position.row][position.col] = move.playerColor;
      }
    }
  }

  nextBoard[move.location.row][move.location.col] = move.playerColor;

  return ok(nextBoard);
}

export function isMoveValid(board: Board, move: GameMove): boolean {
  if (
    !isInBounds(move.location) ||
    isCellOccupied(board, move.location)
  ) {
    return false;
  }

  const opponentColor = getOpponentColor(move.playerColor);
  return DIRECTIONS.some(([rowDelta, colDelta]) => {
    let newLocation = {
      row: move.location.row + rowDelta,
      col: move.location.col + colDelta,
    };

    // A valid direction must start with at least one opponent piece.
    if (
      !isInBounds(newLocation) ||
      !isCellOccupiedByPlayer(board, newLocation, opponentColor)
    ) {
      return false;
    }

    newLocation.row += rowDelta;
    newLocation.col += colDelta;

    while (isInBounds(newLocation)) {
      const color = getCellColor(board, newLocation);

      if (color === null) {
        return false;
      }

      if (color === move.playerColor) {
        return true;
      }

      newLocation.row += rowDelta;
      newLocation.col += colDelta;
    }

    return false;
  });
}

function getCellColor(board: Board, location: BoardLocation): BoardCell {
  return board[location.row][location.col];
}

function isInBounds(location: BoardLocation): boolean {
  return (
    location.row >= 0 &&
    location.row < BOARD_SIZE &&
    location.col >= 0 &&
    location.col < BOARD_SIZE
  );
}

function isCellOccupied(board: Board, location: BoardLocation): boolean {
  return board[location.row][location.col] !== null;
}

function isCellOccupiedByPlayer(
  board: Board,
  location: BoardLocation,
  playerColor: PlayerColor,
): boolean {
  return board[location.row][location.col] === playerColor;
}
