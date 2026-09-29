import { Navigate, Outlet } from 'react-router';
import { authClient } from '../lib/auth-client';
import { LoadingView } from './LoadingView';

export function GuestOnlyRoute() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <LoadingView />;
  }

  if (session) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
