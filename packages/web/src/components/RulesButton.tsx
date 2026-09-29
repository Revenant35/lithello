import { ArrowUpRight, BookOpen, X } from 'lucide-react';
import { useId, useRef } from 'react';

export function RulesButton({
  className = 'text-button',
}: {
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => dialog.current?.showModal()}
      >
        <BookOpen size={16} aria-hidden="true" /> How to play{' '}
        <ArrowUpRight size={14} aria-hidden="true" />
      </button>
      <dialog
        ref={dialog}
        className="rules-dialog"
        aria-labelledby={headingId}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="flex items-center justify-between">
          <span className="eyebrow">
            A minute to learn. A lifetime to master.
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label="Close rules"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <h2 id={headingId} className="display-heading mt-5 text-5xl">
          Make your move.
        </h2>
        <p className="mt-4 text-sm leading-7 text-parchment-500">
          Othello is a game of turning the tables. Your goal? Finish with more
          discs of your color on the board.
        </p>
        <ol className="rules-list">
          <li>
            <span>01</span>
            <div>
              <h3>Black goes first.</h3>
              <p>
                Start with four discs in the center. Players take turns placing
                one disc on an empty square.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Surround. Flip. Repeat.</h3>
              <p>
                Trap a line of your opponent’s discs between your new disc and
                one of your own—horizontally, vertically, or diagonally. Every
                trapped disc flips to your color.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Make every square count.</h3>
              <p>
                Every move must flip at least one disc. Highlighted squares show
                your legal moves. If you have none, your turn is passed
                automatically.
              </p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>Own the board.</h3>
              <p>
                When neither player can move, the most discs wins. Watch your
                clock: running out of time or resigning gives your opponent the
                win.
              </p>
            </div>
          </li>
        </ol>
        <button
          type="button"
          className="button-primary w-full"
          onClick={() => dialog.current?.close()}
        >
          Got it. Let’s play <ArrowUpRight size={18} />
        </button>
      </dialog>
    </>
  );
}
