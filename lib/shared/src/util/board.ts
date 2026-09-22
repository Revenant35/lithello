import { err, ok, Result } from "neverthrow";
import {
  Board,
  BOARD_SIZE,
  BoardCellColor,
  BoardError,
  BoardLocation,
  GameScore,
  PlayerColor,
  PlayerScore,
} from "../types/index.ts";

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

export function getPlayerScore(board: Board, playerColor: PlayerColor): PlayerScore {
  return board.reduce((score, row) => score + row.filter((cell) => cell === playerColor).length, 0);
}

export function getGameScore(board: Board): GameScore {
  return {
    w: getPlayerScore(board, "w"),
    b: getPlayerScore(board, "b"),
  };
}

export function getOpponentColor(playerColor: PlayerColor): PlayerColor {
  return playerColor === "w" ? "b" : "w";
}

export function getValidMoveLocations(board: Board, playerColor: PlayerColor): BoardLocation[] {
  const locations: BoardLocation[] = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const location = { row, col };
      if (isMoveValid(board, location, playerColor)) {
        locations.push(location);
      }
    }
  }

  return locations;
}

export function performMove(
  board: Board,
  location: BoardLocation,
  playerColor: PlayerColor,
): Result<Board, BoardError> {
  if (!isMoveValid(board, location, playerColor)) {
    return err(BoardError.ILLEGAL_MOVE);
  }

  const { row, col } = location;

  const opponentColor = getOpponentColor(playerColor);
  const nextBoard = structuredClone(board);

  for (const [rowDelta, colDelta] of DIRECTIONS) {
    const toFlip: BoardLocation[] = [];

    let nextRow = row + rowDelta;
    let nextCol = col + colDelta;

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
      board[nextRow][nextCol] === playerColor
    ) {
      for (const position of toFlip) {
        nextBoard[position.row][position.col] = playerColor;
      }
    }
  }

  nextBoard[row][col] = playerColor;

  return ok(nextBoard);
}

export function isMoveValid(
  board: Board,
  location: BoardLocation,
  playerColor: PlayerColor,
): boolean {
  if (!isInBounds(location) || isCellOccupied(board, location)) {
    return false;
  }

  const opponentColor = getOpponentColor(playerColor);
  return DIRECTIONS.some(([rowDelta, colDelta]) => {
    let newLocation = { row: location.row + rowDelta, col: location.col + colDelta };

    // A valid direction must start with at least one opponent piece.
    if (!isInBounds(newLocation) || !isCellOccupiedByPlayer(board, newLocation, opponentColor)) {
      return false;
    }

    newLocation.row += rowDelta;
    newLocation.col += colDelta;

    while (isInBounds(newLocation)) {
      const color = getCellColor(board, newLocation);

      if (color === null) {
        return false;
      }

      if (color === playerColor) {
        return true;
      }

      newLocation.row += rowDelta;
      newLocation.col += colDelta;
    }

    return false;
  });
}

function getCellColor(board: Board, location: BoardLocation): BoardCellColor {
  return board[location.row][location.col];
}

function isInBounds(location: BoardLocation): boolean {
  const { row, col } = location;
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function isCellOccupied(board: Board, location: BoardLocation): boolean {
  const { row, col } = location;
  return board[row][col] !== null;
}

function isCellOccupiedByPlayer(
  board: Board,
  location: BoardLocation,
  playerColor: PlayerColor,
): boolean {
  const { row, col } = location;
  return board[row][col] === playerColor;
}
