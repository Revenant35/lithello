import { useRef } from 'react';
import { Flag } from 'lucide-react';
import type { GameAction } from '@lithello/shared';
import { formatBoardLocation } from '../lib/board';

function formatAction(action: GameAction | undefined) {
  if (!action) {
    return null;
  }

  return action.kind === 'pass' ? 'Pass' : formatBoardLocation(action.location);
}

export function MoveHistory({
  moves,
  onResign,
}: {
  moves: readonly GameAction[];
  onResign?: () => void;
}) {
  const resignDialog = useRef<HTMLDialogElement>(null);
  const turns = Array.from(
    { length: Math.ceil(moves.length / 2) },
    (_, index) => ({
      black: moves[index * 2],
      white: moves[index * 2 + 1],
    }),
  );

  return (
    <section
      aria-label="Move history"
      className="flex max-h-[28rem] min-h-64 flex-col self-stretch overflow-hidden rounded-lg border border-wood-700 bg-wood-800"
    >
      <header className="border-b border-wood-700">
        <h2 className="flex items-center justify-between px-5 pt-5 pb-4 text-sm font-semibold text-parchment-50">
          The moves so far{' '}
          <span className="text-xs font-normal text-parchment-500">
            {moves.length}
          </span>
        </h2>
        <div
          aria-hidden
          className="grid grid-cols-[2.5rem_repeat(2,minmax(0,1fr))] items-center px-5 pb-3 font-mono text-[0.65rem] font-bold tracking-wide text-parchment-500 uppercase"
        >
          <span />
          <span>Black</span>
          <span>White</span>
        </div>
      </header>

      {turns.length === 0 ? (
        <p className="grid flex-1 place-items-center text-sm text-parchment-500">
          Every great game starts with one move.
        </p>
      ) : (
        <ol className="flex-1 list-none overflow-y-auto">
          {turns.map((turn, index) => (
            // Move history is append-only, so an item's turn index remains stable.
            // oxlint-disable-next-line react/no-array-index-key
            <li
              key={index}
              className="grid min-h-10 grid-cols-[2.5rem_repeat(2,minmax(0,1fr))] items-center px-5 font-mono text-xs text-parchment-50 even:bg-wood-900/60"
            >
              <span className="text-parchment-500">{index + 1}.</span>
              <span
                className={
                  turn.black?.kind === 'pass' ? 'text-parchment-500' : undefined
                }
              >
                {formatAction(turn.black)}
              </span>
              <span
                className={
                  turn.white?.kind === 'pass' ? 'text-parchment-500' : undefined
                }
              >
                {formatAction(turn.white)}
              </span>
            </li>
          ))}
        </ol>
      )}

      {onResign && (
        <>
          <footer className="flex flex-col gap-2 border-t border-wood-700 p-3">
            <button
              type="button"
              onClick={() => resignDialog.current?.showModal()}
              className="flex w-full items-center justify-center gap-2 rounded border border-ember-600/40 px-3 py-2 text-sm font-semibold text-ember-500 transition-colors hover:border-ember-500/60 hover:bg-ember-600/10"
            >
              <Flag aria-hidden size={15} />
              Resign
            </button>
          </footer>

          <dialog
            ref={resignDialog}
            aria-label="Confirm resignation"
            className="m-auto w-[min(calc(100%-2rem),26rem)] rounded-md border border-wood-700 bg-wood-800 p-6 text-parchment-50 shadow-2xl backdrop:bg-black/70"
          >
            <h3 className="text-xl font-medium">Resign this game?</h3>
            <p className="mt-3 mb-6 text-sm leading-relaxed text-parchment-300">
              This will end the game and award the win to your opponent.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                autoFocus
                onClick={() => resignDialog.current?.close()}
                className="rounded border border-wood-600 px-3 py-2 text-sm font-medium text-parchment-50 transition-colors hover:bg-wood-700"
              >
                Keep playing
              </button>
              <button
                type="button"
                onClick={() => {
                  resignDialog.current?.close();
                  onResign();
                }}
                className="rounded border border-ember-600 bg-ember-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-ember-500"
              >
                Resign
              </button>
            </div>
          </dialog>
        </>
      )}
    </section>
  );
}
