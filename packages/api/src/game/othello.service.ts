import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class OthelloService {
  private readonly logger = new Logger(OthelloService.name);

  get initialBoard(): Board {
    return structuredClone(INITIAL_BOARD);
  }

  getPlayerScore(board: Board, playerColor: PlayerColor): PlayerScore {
    return board.reduce(
      (score, row) => score + row.filter((cell) => cell === playerColor).length,
      0,
    );
  }

  getGameScore(board: Board): GameScore {
    return {
      white: this.getPlayerScore(board, 'w'),
      black: this.getPlayerScore(board, 'b'),
    };
  }

  getOpponentColor(playerColor: PlayerColor): PlayerColor {
    return playerColor === 'w' ? 'b' : 'w';
  }

  getValidMoveLocations(
    board: Board,
    playerColor: PlayerColor,
  ): BoardLocation[] {
    const locations: BoardLocation[] = [];

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const location = { row, col };
        if (this.isMoveValid(board, { location, playerColor })) {
          locations.push(location);
        }
      }
    }

    return locations;
  }

  performMoves(
    board: Board,
    moves: GameMove[],
  ): Result<Board, OthelloServiceError> {
    let finalBoard = structuredClone(board);
    for (const move of moves) {
      const result = this.performMove(board, move);

      if (result.isErr()) {
        return err(OthelloServiceError.IllegalMove);
      }

      finalBoard = result.value;
    }

    return ok(finalBoard);
  }

  performMove(
    board: Board,
    move: GameMove,
  ): Result<Board, OthelloServiceError> {
    if (!this.isMoveValid(board, move)) {
      this.logger.error('Illegal move attempted', move);
      return err(OthelloServiceError.IllegalMove);
    }

    const opponentColor = this.getOpponentColor(move.playerColor);
    const nextBoard = structuredClone(board);

    for (const [rowDelta, colDelta] of DIRECTIONS) {
      const toFlip: BoardLocation[] = [];

      let nextRow = move.location.row + rowDelta;
      let nextCol = move.location.col + colDelta;

      while (
        this.isInBounds({ row: nextRow, col: nextCol }) &&
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
        this.isInBounds({ row: nextRow, col: nextCol }) &&
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

  isMoveValid(board: Board, move: GameMove): boolean {
    if (
      !this.isInBounds(move.location) ||
      this.isCellOccupied(board, move.location)
    ) {
      return false;
    }

    const opponentColor = this.getOpponentColor(move.playerColor);
    return DIRECTIONS.some(([rowDelta, colDelta]) => {
      let newLocation = {
        row: move.location.row + rowDelta,
        col: move.location.col + colDelta,
      };

      // A valid direction must start with at least one opponent piece.
      if (
        !this.isInBounds(newLocation) ||
        !this.isCellOccupiedByPlayer(board, newLocation, opponentColor)
      ) {
        return false;
      }

      newLocation.row += rowDelta;
      newLocation.col += colDelta;

      while (this.isInBounds(newLocation)) {
        const color = this.getCellColor(board, newLocation);

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

  private getCellColor(board: Board, location: BoardLocation): BoardCell {
    return board[location.row][location.col];
  }

  private isInBounds(location: BoardLocation): boolean {
    return (
      location.row >= 0 &&
      location.row < BOARD_SIZE &&
      location.col >= 0 &&
      location.col < BOARD_SIZE
    );
  }

  private isCellOccupied(board: Board, location: BoardLocation): boolean {
    return board[location.row][location.col] !== null;
  }

  private isCellOccupiedByPlayer(
    board: Board,
    location: BoardLocation,
    playerColor: PlayerColor,
  ): boolean {
    return board[location.row][location.col] === playerColor;
  }
}
