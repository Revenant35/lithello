import { Link } from 'react-router';
import type { GameSummary } from '@lithello/shared';

function getOutcome(summary: GameSummary): 'win' | 'loss' | 'draw' {
  if (summary.result === 'draw') {
    return 'draw';
  }

  const winnerColor = summary.result === 'white_win' ? 'w' : 'b';
  return summary.viewerColor === winnerColor ? 'win' : 'loss';
}

const OUTCOME_COPY: Record<'win' | 'loss' | 'draw', string> = {
  win: 'Win',
  loss: 'Loss',
  draw: 'Draw',
};

const OUTCOME_CLASS: Record<'win' | 'loss' | 'draw', string> = {
  win: 'text-moss-500',
  loss: 'text-ember-500',
  draw: 'text-parchment-300',
};

export function MatchHistory({ games }: { games: readonly GameSummary[] }) {
  if (games.length === 0) {
    return (
      <p className="text-center text-sm text-parchment-500">
        No matches played yet
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {games.map((game) => {
        const outcome = getOutcome(game);

        return (
          <li key={game.id}>
            <Link
              to={`/game/${game.id}`}
              className="flex items-center justify-between rounded-lg border border-wood-700 bg-wood-900 px-4 py-3 transition-colors hover:bg-wood-800"
            >
              <span className="text-parchment-50">vs {game.opponent.name}</span>
              <span className="flex items-center gap-3 text-sm">
                <span className={`font-semibold ${OUTCOME_CLASS[outcome]}`}>
                  {OUTCOME_COPY[outcome]}
                </span>
                <span className="text-parchment-500">
                  {game.endedAt.toLocaleDateString()}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
