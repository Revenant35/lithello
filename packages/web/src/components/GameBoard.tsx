import { Fragment } from 'react';
import { type GameBoard as Board, getSquareColor, type Square } from '@lithello/shared';
import { FILES, RANKS, squareAt } from '../lib/board';

export function GameBoard({
  board,
  legalMoves,
  onMove,
}: {
  board: Board;
  legalMoves: readonly Square[];
  onMove: (square: Square) => void;
}) {
  return (
    <fieldset aria-label="Othello board" className="game-board">
      {RANKS.map((rank, rowIndex) => (
        <Fragment key={rank}>
          {FILES.map((file, colIndex) => {
            const square = squareAt(rowIndex, colIndex);
            const coordinate = `${file}${rank}`;
            const color = getSquareColor(board, square);
            const isLegalMove = color === null && legalMoves.includes(square);

            return (
              <button
                type="button"
                key={coordinate}
                disabled={!isLegalMove}
                aria-label={`${coordinate.toUpperCase()}, ${color === 'w' ? 'white' : color === 'b' ? 'black' : isLegalMove ? 'possible move' : 'empty'}`}
                onClick={() => onMove(square)}
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
                {isLegalMove && (
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
