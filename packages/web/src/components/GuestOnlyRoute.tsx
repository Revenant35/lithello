import { Navigate, Outlet } from 'react-router';
import { authClient } from '../lib/auth-client';

export function GuestOnlyRoute() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return null;
  }

  if (session) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
