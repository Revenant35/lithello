import { Link } from 'react-router';
import { ArrowUpRight, History } from 'lucide-react';
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
  win: 'result-win',
  loss: 'result-loss',
  draw: 'result-draw',
};

export function MatchHistory({ games }: { games: readonly GameSummary[] }) {
  if (games.length === 0) {
    return (
      <div className="empty-history">
        <span className="empty-icon">
          <History size={20} aria-hidden="true" />
        </span>
        <h3>Your first rivalry awaits.</h3>
        <p>
          No matches just yet. Create a lobby and invite a friend to get your
          story started.
        </p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {games.map((game) => {
        const outcome = getOutcome(game);

        return (
          <li key={game.id}>
            <Link to={`/game/${game.id}`} className="match-link">
              <span className="user-avatar" aria-hidden="true">
                {game.opponent.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="match-opponent">
                <strong>vs. {game.opponent.name}</strong>
                <span>
                  {game.endedAt.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className={`result-tag ${OUTCOME_CLASS[outcome]}`}>
                  {OUTCOME_COPY[outcome]}
                </span>
                <ArrowUpRight
                  size={16}
                  aria-hidden="true"
                  className="text-parchment-500"
                />
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
