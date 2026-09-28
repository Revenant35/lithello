import { useEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { io, type Socket } from 'socket.io-client';
import {
  GameIDSchema,
  GameStateSchema,
  type GameState,
  type ClientToServerGameEvents,
  type ServerToClientGameEvents,
} from '@lithello/shared';

const GAME_SOCKET_URL = `${import.meta.env.VITE_API_URL}/game`;

export function GameView() {
  const { gameId } = useParams<{ gameId: string }>();
  const [isConnected, setIsConnected] = useState(false);
  const [game, setGame] = useState<GameState | null>(null);
  const [connectFailed, setConnectFailed] = useState(false);
  const socketRef = useRef<
    Socket<ServerToClientGameEvents, ClientToServerGameEvents> | null
  >(null);

  const result = GameIDSchema.safeParse(gameId);

  useEffect(() => {
    if (!result.success) {
      return;
    }

    const socket: Socket<ServerToClientGameEvents, ClientToServerGameEvents> =
      io(GAME_SOCKET_URL, {
        transports: ['websocket'],
        auth: { gameId: result.data },
      });
    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => setConnectFailed(true));

    socket.on('state', (data: unknown) => {
      const parsed = GameStateSchema.safeParse(data);
      if (parsed.success) {
        setGame(parsed.data);
      }
    });

    // TODO: remove this once we're done debugging socket events
    socket.onAny((event, ...args) => console.log(event, ...args));

    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, [result.success, result.data]);

  if (!result.success || connectFailed) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-cream-100 p-6 dark:bg-neutral-950">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-cream-200 bg-cream-50 p-8 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-center text-2xl font-medium text-ink dark:text-neutral-100">
          Game
        </h1>

        {game ? (
          <p className="text-center text-sm text-slate dark:text-neutral-500">
            Game state loaded.
          </p>
        ) : (
          <p className="text-center text-sm text-slate dark:text-neutral-500">
            Loading game…
          </p>
        )}

        <p className="text-center text-xs text-slate dark:text-neutral-500">
          Socket: {isConnected ? 'connected' : 'disconnected'}
        </p>
      </div>
    </div>
  );
}
