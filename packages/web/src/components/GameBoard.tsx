import { Fragment } from 'react';
import type { Board, BoardLocation } from '@lithello/shared';
import { FILES, RANKS } from '../lib/board';

function locationMatches(a: BoardLocation, b: BoardLocation) {
  return a.row === b.row && a.col === b.col;
}

export function GameBoard({
  board,
  possibleMoves,
  onMove,
}: {
  board: Board;
  possibleMoves: readonly BoardLocation[];
  onMove: (location: BoardLocation) => void;
}) {
  return (
    <fieldset aria-label="Othello board" className="game-board">
      {RANKS.map((rank, rowIndex) => (
        <Fragment key={rank}>
          {FILES.map((file, colIndex) => {
            const location: BoardLocation = { row: rowIndex, col: colIndex };
            const coordinate = `${file}${rank}`;
            const color = board[rowIndex]?.[colIndex] ?? null;
            const isPossibleMove =
              color === null &&
              possibleMoves.some((m) => locationMatches(m, location));

            return (
              <button
                type="button"
                key={coordinate}
                disabled={!isPossibleMove}
                aria-label={`${coordinate.toUpperCase()}, ${color === 'w' ? 'white' : color === 'b' ? 'black' : isPossibleMove ? 'possible move' : 'empty'}`}
                onClick={() => onMove(location)}
                className="board-square"
              >
                {colIndex === 0 && (
                  <span
                    className="board-coordinate board-coordinate-rank"
                    aria-hidden="true"
                  >
                    {rank}
                  </span>
                )}
                {rowIndex === 0 && (
                  <span
                    className="board-coordinate board-coordinate-file"
                    aria-hidden="true"
                  >
                    {file.toUpperCase()}
                  </span>
                )}
                {color && (
                  <span className={`disc disc-${color}`} aria-hidden="true" />
                )}
                {isPossibleMove && (
                  <span className="legal-move" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </Fragment>
      ))}
    </fieldset>
  );
}
