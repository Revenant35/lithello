import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { io, type Socket } from 'socket.io-client';
import {
  LobbyIDSchema,
  LobbySchema,
  type Lobby,
  type ClientToServerLobbyEvents,
  type ServerToClientLobbyEvents,
} from '@lithello/shared';
import { LobbyMemberCard } from '../components/LobbyMemberCard';
import { authClient } from '../lib/auth-client';

const LOBBY_SOCKET_URL = `${import.meta.env.VITE_API_URL}/lobby`;

export function LobbyView() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [connectFailed, setConnectFailed] = useState(false);
  const socketRef = useRef<
    Socket<ServerToClientLobbyEvents, ClientToServerLobbyEvents> | null
  >(null);

  const result = LobbyIDSchema.safeParse(lobbyId);

  useEffect(() => {
    if (!result.success) {
      return;
    }

    const socket: Socket<ServerToClientLobbyEvents, ClientToServerLobbyEvents> =
      io(LOBBY_SOCKET_URL, {
        transports: ['websocket'],
        auth: { lobbyId: result.data },
      });
    socketRef.current = socket;

    socket.on('connect_error', () => setConnectFailed(true));

    socket.on('state', (data: unknown) => {
      const parsed = LobbySchema.safeParse(data);
      if (parsed.success) {
        setLobby(parsed.data);
      }
    });

    socket.on('game-started', ({ gameId }) => {
      navigate(`/game/${gameId}`);
    });

    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, [result.success, result.data, navigate]);

  if (!result.success || connectFailed) {
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
    <div className="flex min-h-svh items-center justify-center bg-wood-950 p-6">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-wood-700 bg-wood-800 p-8 shadow-lg">
        <h1 className="text-center text-2xl font-medium text-parchment-50">
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
          <p className="text-center text-sm text-parchment-500">
            Loading lobby…
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={!myMember}
            onClick={() =>
              socketRef.current?.emit(myMember?.isReady ? 'unready' : 'ready')
            }
            className="rounded-lg bg-brass-400 px-3 py-2 font-medium text-wood-950 transition-colors hover:enabled:bg-brass-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {myMember?.isReady ? 'Unready' : 'Ready'}
          </button>
          <button
            type="button"
            onClick={() => {
              socketRef.current?.emit('leave');
              navigate('/home');
            }}
            className="rounded-lg border border-wood-600 px-3 py-2 font-medium text-parchment-50 transition-colors hover:bg-wood-700"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
