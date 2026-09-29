import { Navigate, Outlet } from 'react-router';
import { usePlayer } from '../lib/player-context';

/**
 * Keeps everything behind it unreachable until the user has a player record.
 *
 * The redirect is what makes onboarding unskippable: navigating or deep-linking
 * to any guarded route lands back on /onboarding until a rating exists.
 */
export function RequirePlayerRoute() {
  const { player } = usePlayer();

  if (player === null) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
