import { Link } from 'react-router';
import { Flag, Handshake, Trophy } from 'lucide-react';
import type { FinishedGameState, PlayerColor } from '@lithello/shared';

const REASON_COPY: Record<FinishedGameState['endReason'], string> = {
  normal: 'Final result',
  resignation: 'By resignation',
  timeout: 'By timeout',
};

const OUTCOME_ICON = {
  win: Trophy,
  loss: Flag,
  draw: Handshake,
} as const;

function getOutcomeCopy(args: {
  result: FinishedGameState['result'];
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
  viewerColor,
}: {
  result: FinishedGameState['result'];
  endReason: FinishedGameState['endReason'];
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
      </div>

      <Link to="/home" className="button-primary col-span-2">
        Back to the clubhouse
      </Link>
    </section>
  );
}
