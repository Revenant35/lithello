import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { io, type Socket } from 'socket.io-client';
import { LobbyIDSchema, LobbySchema, type Lobby } from '@lithello/shared';
import { LobbyMemberCard } from '../components/LobbyMemberCard';
import { authClient } from '../lib/auth-client';

const LOBBY_SOCKET_URL = `${import.meta.env.VITE_API_URL}/lobby`;

export function LobbyView() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const result = LobbyIDSchema.safeParse(lobbyId);

  useEffect(() => {
    if (!result.success) {
      return;
    }

    const socket: Socket = io(LOBBY_SOCKET_URL, {
      transports: ['websocket'],
      auth: { lobbyId: result.data },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('state');
    });
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('state', (data: unknown) => {
      const parsed = LobbySchema.safeParse(data);
      if (parsed.success) {
        setLobby(parsed.data);
      }
    });

    // TODO: remove this once we're done debugging socket events
    socket.onAny((event, ...args) => console.log(event, ...args));

    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, [result.success, result.data]);

  if (!result.success) {
    return <Navigate to="/home" replace />;
  }

  const myMember =
    lobby && session
      ? lobby.host.id === session.user.id
        ? lobby.host
        : lobby.guest?.id === session.user.id
          ? lobby.guest
          : undefined
      : undefined;

  return (
    <div className="flex min-h-svh items-center justify-center bg-cream-100 p-6 dark:bg-neutral-950">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-cream-200 bg-cream-50 p-8 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-center text-2xl font-medium text-ink dark:text-neutral-100">
          Lobby
        </h1>

        {lobby ? (
          <div className="flex flex-col gap-3">
            <LobbyMemberCard member={lobby.host} isHost />
            {lobby.guest && (
              <LobbyMemberCard member={lobby.guest} isHost={false} />
            )}
          </div>
        ) : (
          <p className="text-center text-sm text-slate dark:text-neutral-500">
            Loading lobby…
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={!myMember}
            onClick={() =>
              socketRef.current?.emit('set-ready', {
                isReady: !(myMember?.isReady ?? false),
              })
            }
            className="rounded-lg bg-blue-muted px-3 py-2 font-medium text-white transition-colors hover:enabled:bg-blue-muted-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {myMember?.isReady ? 'Unready' : 'Ready'}
          </button>
          <button
            type="button"
            onClick={() => {
              socketRef.current?.emit('leave');
              navigate('/home');
            }}
            className="rounded-lg border border-cream-200 px-3 py-2 font-medium text-ink transition-colors hover:bg-cream-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            Leave
          </button>
        </div>

        <p className="text-center text-xs text-slate dark:text-neutral-500">
          Socket: {isConnected ? 'connected' : 'disconnected'}
        </p>
      </div>
    </div>
  );
}
