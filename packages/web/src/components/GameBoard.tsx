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
    <fieldset
      aria-label="Othello board"
      className="m-0 grid aspect-square w-full grid-cols-8 overflow-hidden rounded-md border-[clamp(0.35rem,1.2vw,0.75rem)] border-board-frame bg-board-felt p-0 shadow-[0_1.5rem_4rem_rgba(0,0,0,0.32),inset_0_0_0_1px_rgba(255,255,255,0.08)]"
    >
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
                className="relative grid aspect-square min-w-0 place-items-center border-0 border-r border-b border-black/40 bg-board-square p-0 text-neutral-100 not-disabled:hover:bg-board-square-hover disabled:cursor-default [&:nth-child(8n)]:border-r-0 [&:nth-child(n+57)]:border-b-0"
              >
                {colIndex === 0 && (
                  <span className="absolute top-1 left-1 text-[clamp(0.45rem,1.4vw,0.66rem)] font-bold text-white/60">
                    {rank}
                  </span>
                )}
                {rowIndex === 0 && (
                  <span className="absolute right-1 bottom-1 text-[clamp(0.45rem,1.4vw,0.66rem)] font-bold text-white/60">
                    {file.toUpperCase()}
                  </span>
                )}
                {color && (
                  <span
                    className={
                      color === 'w'
                        ? 'pointer-events-none aspect-square w-[76%] animate-[place-disc_180ms_ease-out] rounded-full bg-[radial-gradient(circle_at_38%_28%,#fff_0%,#e9e8df_55%,#b9b9b2_100%)] shadow-[0_0.18rem_0.35rem_rgba(0,0,0,0.35),inset_0_0.08rem_0.16rem_rgba(255,255,255,0.24)]'
                        : 'pointer-events-none aspect-square w-[76%] animate-[place-disc_180ms_ease-out] rounded-full bg-[radial-gradient(circle_at_38%_28%,#46504b_0%,#171b19_45%,#080a09_100%)] shadow-[0_0.18rem_0.35rem_rgba(0,0,0,0.35),inset_0_0.08rem_0.16rem_rgba(255,255,255,0.24)]'
                    }
                  />
                )}
                {isPossibleMove && (
                  <span className="pointer-events-none aspect-square w-[48%] rounded-full border-2 border-white/70" />
                )}
              </button>
            );
          })}
        </Fragment>
      ))}
    </fieldset>
  );
}
