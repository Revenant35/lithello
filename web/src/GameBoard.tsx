import { Fragment } from "react";

import {
  BOARD_SIZE,
  type Board,
  type BoardLocation,
  type TurnAction,
} from "@lithello/shared/types";
import "./GameBoard.css";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"] as const;

function locationMatches(a: BoardLocation, b: BoardLocation) {
  return a.row === b.row && a.col === b.col;
}

interface GameBoardProps {
  board: Board;
  possibleMoves: readonly BoardLocation[];
  onMove: (action: TurnAction) => void;
}

export function GameBoard({ board, possibleMoves, onMove }: GameBoardProps) {
  return (
    <fieldset className="othello-board" aria-label="Othello board">
      {Array.from({ length: BOARD_SIZE }, (_, rowIndex) => (
        <Fragment key={rowIndex}>
          {Array.from({ length: BOARD_SIZE }, (_, colIndex) => {
            const location: BoardLocation = { row: rowIndex, col: colIndex };
            const coordinate = `${FILES[colIndex]}${RANKS[rowIndex]}`;
            const color = board[rowIndex][colIndex];
            const isPossibleMove =
              color === null && possibleMoves.some((m) => locationMatches(m, location));

            return (
              <button
                className="othello-square"
                type="button"
                key={coordinate}
                disabled={!isPossibleMove}
                aria-label={`${coordinate.toUpperCase()}, ${color === "w" ? "white" : color === "b" ? "black" : isPossibleMove ? "possible move" : "empty"}`}
                onClick={() => onMove({ kind: "move", location, playerColor: "b" })}
              >
                {colIndex === 0 && (
                  <span className="othello-coordinate othello-coordinate-row">
                    {RANKS[rowIndex]}
                  </span>
                )}
                {rowIndex === 0 && (
                  <span className="othello-coordinate othello-coordinate-column">
                    {FILES[colIndex].toUpperCase()}
                  </span>
                )}
                {color && (
                  <span
                    className={`othello-disc othello-disc-${color === "w" ? "white" : "black"}`}
                  />
                )}
                {isPossibleMove && <span className="othello-possible-move" />}
              </button>
            );
          })}
        </Fragment>
      ))}
    </fieldset>
  );
}
