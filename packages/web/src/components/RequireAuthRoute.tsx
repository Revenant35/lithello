import { Navigate, Outlet, useLocation } from 'react-router';
import { authClient } from '../lib/auth-client';
import { LoadingView } from './LoadingView';

export function RequireAuthRoute() {
  const { data: session, isPending } = authClient.useSession();
  const location = useLocation();

  if (isPending) {
    return <LoadingView />;
  }

  if (!session) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
