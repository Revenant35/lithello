import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { io, type Socket } from 'socket.io-client';
import { LobbyIDSchema } from '@lithello/shared';

const LOBBY_SOCKET_URL = `${import.meta.env.VITE_API_URL}/lobby`;

export function LobbyView() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const [isConnected, setIsConnected] = useState(false);

  const result = LobbyIDSchema.safeParse(lobbyId);

  useEffect(() => {
    if (!result.success) {
      return;
    }

    const socket: Socket = io(LOBBY_SOCKET_URL, {
      transports: ['websocket'],
      auth: { lobbyId: result.data },
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    // TODO: remove this once we're done debugging socket events
    socket.onAny((event, ...args) => console.log(event, ...args));

    return () => {
      socket.disconnect();
    };
  }, [result.success, result.data]);

  if (!result.success) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-cream-50 dark:bg-neutral-900">
      <p className="text-ink dark:text-neutral-100">
        Lobby socket status: {isConnected ? 'connected' : 'disconnected'}
      </p>
    </div>
  );
}
