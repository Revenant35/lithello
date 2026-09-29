import { Navigate, Outlet, useLocation } from 'react-router';
import { authClient } from '../lib/auth-client';
import { getRedirectPath } from '../lib/redirect';
import { LoadingView } from './LoadingView';

export function GuestOnlyRoute() {
  const { data: session, isPending } = authClient.useSession();
  const location = useLocation();

  if (isPending) {
    return <LoadingView />;
  }

  if (session) {
    return <Navigate to={getRedirectPath(location.state)} replace />;
  }

  return <Outlet />;
}
