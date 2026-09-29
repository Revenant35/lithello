import { Link } from 'react-router';
import { ArrowUpRight, History } from 'lucide-react';
import {
  type Game,
  getRatingDelta,
  type PlayerColor,
  type UserID,
} from '@lithello/shared';

function getViewerSeat(game: Game, viewerId: UserID) {
  return game.white.id === viewerId ? game.white : game.black;
}

function getOutcome(
  game: Game,
  viewerColor: PlayerColor,
): 'win' | 'loss' | 'draw' | null {
  if (game.result === null) {
    return null;
  }

  if (game.result === 'draw') {
    return 'draw';
  }

  const winnerColor = game.result === 'white_win' ? 'w' : 'b';
  return viewerColor === winnerColor ? 'win' : 'loss';
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

function formatRatingDelta(delta: number | null): string | null {
  if (delta === null || delta === 0) {
    return null;
  }

  return delta > 0 ? `+${delta}` : String(delta);
}

export function MatchHistory({
  games,
  viewerId,
}: {
  games: readonly Game[];
  viewerId: UserID;
}) {
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
        const viewer = getViewerSeat(game, viewerId);
        const opponent = viewer === game.white ? game.black : game.white;
        const outcome = getOutcome(game, viewer.color);
        const ratingDelta = formatRatingDelta(getRatingDelta(viewer));

        return (
          <li key={game.id}>
            <Link to={`/game/${game.id}`} className="match-link">
              <span className="user-avatar" aria-hidden="true">
                {opponent.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="match-opponent">
                <strong>vs. {opponent.name}</strong>
                <span>
                  {(game.endedAt ?? game.createdAt).toLocaleDateString(
                    undefined,
                    { month: 'short', day: 'numeric', year: 'numeric' },
                  )}
                </span>
              </span>
              <span className="flex items-center gap-3">
                {ratingDelta && (
                  <span className="font-mono text-xs text-parchment-500">
                    {ratingDelta}
                  </span>
                )}
                <span
                  className={`result-tag ${outcome ? OUTCOME_CLASS[outcome] : ''}`}
                >
                  {outcome ? OUTCOME_COPY[outcome] : 'In progress'}
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
