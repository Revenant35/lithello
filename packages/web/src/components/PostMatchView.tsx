import { Link } from 'react-router';
import { Flag, Handshake, Trophy } from 'lucide-react';
import type { GameEndReason, GameResult, PlayerColor } from '@lithello/shared';

const REASON_COPY: Record<GameEndReason, string> = {
  normal: 'Final result',
  resignation: 'By resignation',
  timeout: 'By timeout',
  abandonment: 'By abandonment',
};

const OUTCOME_ICON = {
  win: Trophy,
  loss: Flag,
  draw: Handshake,
} as const;

function getOutcomeCopy(args: {
  result: GameResult;
  viewerColor?: PlayerColor;
}): { heading: string; message: string; outcome: 'win' | 'loss' | 'draw' } {
  const { result, viewerColor } = args;

  if (result === 'draw') {
    return {
      heading: 'Draw game',
      message: 'The board ends even.',
      outcome: 'draw',
    };
  }

  const winnerColor = result === 'white_win' ? 'w' : 'b';
  const winnerName = winnerColor === 'w' ? 'White' : 'Black';

  if (viewerColor === undefined) {
    return {
      heading: `${winnerName} wins`,
      message: 'The board is claimed.',
      outcome: 'win',
    };
  }

  return viewerColor === winnerColor
    ? { heading: 'You win!', message: 'The board is yours.', outcome: 'win' }
    : {
        heading: 'Well played.',
        message: 'This one goes to your opponent. There’s always a next game.',
        outcome: 'loss',
      };
}

export function PostMatchView({
  result,
  endReason,
  score,
  viewerColor,
}: {
  result: GameResult;
  endReason: GameEndReason;
  /** Final disc count. */
  score?: { white: number; black: number };
  viewerColor?: PlayerColor;
}) {
  const copy = getOutcomeCopy({ result, viewerColor });
  const OutcomeIcon = OUTCOME_ICON[copy.outcome];

  return (
    <section
      aria-labelledby="post-match-heading"
      aria-live="polite"
      className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-4 rounded-lg border border-wood-700 bg-wood-800 p-5"
    >
      <OutcomeIcon aria-hidden size={20} className="mt-1 text-brass-400" />
      <div>
        <p className="m-0 mb-1 font-mono text-[0.6rem] font-bold tracking-wide text-parchment-500 uppercase">
          {REASON_COPY[endReason]}
        </p>
        <h2
          id="post-match-heading"
          className="display-heading text-3xl text-parchment-50"
        >
          {copy.heading}
        </h2>
        <span className="mt-1 block text-sm text-parchment-300">
          {copy.message}
        </span>

        {score && (
          <p className="mt-3 flex items-center gap-2 text-sm text-parchment-300">
            <span className="font-mono text-[0.6rem] font-bold tracking-wide text-parchment-500 uppercase">
              Final score
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="disc disc-b"
                style={{ width: 11, height: 11 }}
              />
              <strong className="text-parchment-50">{score.black}</strong>
              <span className="sr-only">
                to black{viewerColor === 'b' && ' (you)'},
              </span>
            </span>
            <span aria-hidden className="text-parchment-500">
              &ndash;
            </span>
            <span className="flex items-center gap-1.5">
              <strong className="text-parchment-50">{score.white}</strong>
              <span
                aria-hidden
                className="disc disc-w"
                style={{ width: 11, height: 11 }}
              />
              <span className="sr-only">
                to white{viewerColor === 'w' && ' (you)'}
              </span>
            </span>
          </p>
        )}
      </div>

      <Link to="/home" className="button-primary col-span-2">
        Back to the clubhouse
      </Link>
    </section>
  );
}
