import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

const LOBBY_SOCKET_URL = `${import.meta.env.VITE_API_URL}/lobby`;

export function LobbyView() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket: Socket = io(LOBBY_SOCKET_URL, { transports: ['websocket'] });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="flex min-h-svh items-center justify-center bg-cream-50 dark:bg-neutral-900">
      <p className="text-ink dark:text-neutral-100">
        Lobby socket status: {isConnected ? 'connected' : 'disconnected'}
      </p>
    </div>
  );
}
