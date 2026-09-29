import { Navigate, Outlet } from 'react-router';
import { usePlayer } from '../lib/player-context';

/** The inverse guard, so onboarding cannot be revisited once it is done. */
export function RequireNoPlayerRoute() {
  const { player } = usePlayer();

  if (player !== null) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
