import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Link2,
  Users,
  UserRoundPlus,
} from 'lucide-react';
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
import { AppShell } from '../components/AppShell';
import { authClient } from '../lib/auth-client';

const LOBBY_SOCKET_URL = `${import.meta.env.VITE_API_URL}/lobby`;

export function LobbyView() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [connectFailed, setConnectFailed] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>(
    'idle',
  );
  const socketRef = useRef<Socket<
    ServerToClientLobbyEvents,
    ClientToServerLobbyEvents
  > | null>(null);

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

  async function handleCopyInvite() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  }

  function handleLeave() {
    socketRef.current?.emit('leave');
    navigate('/home');
  }

  return (
    <AppShell>
      <div className="lobby-layout">
        <button type="button" className="back-link" onClick={handleLeave}>
          <ArrowLeft size={14} /> Back to the clubhouse
        </button>
        <div className="lobby-heading">
          <span className="eyebrow accent-text">A TABLE FOR TWO</span>
          <h1 className="display-heading">Good company. Great game.</h1>
          <p>Invite a friend, get comfortable, and make your move.</p>
        </div>
        <div className="lobby-grid">
          <section className="lobby-table" aria-label="Lobby players">
            <div className="section-heading">
              <h2>The players</h2>
              <span>
                {lobby
                  ? `${lobby.guest ? 2 : 1} / 2 seats filled`
                  : 'Connecting…'}
              </span>
            </div>
            {lobby ? (
              <>
                <LobbyMemberCard member={lobby.host} isHost />
                <div className="versus-divider" aria-hidden="true">
                  vs.
                </div>
                {lobby.guest ? (
                  <LobbyMemberCard member={lobby.guest} isHost={false} />
                ) : (
                  <div className="member-card empty-seat">
                    <span className="user-avatar">
                      <UserRoundPlus size={19} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="member-name">A seat for your rival</p>
                      <p className="member-detail">
                        Waiting for a friend to join…
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div role="status" className="empty-history">
                <p>Setting the table…</p>
              </div>
            )}
            <div className="lobby-actions">
              <button
                type="button"
                disabled={!myMember}
                onClick={() =>
                  socketRef.current?.emit(
                    myMember?.isReady ? 'unready' : 'ready',
                  )
                }
                className={
                  myMember?.isReady ? 'button-secondary' : 'button-primary'
                }
              >
                {myMember?.isReady ? (
                  <>
                    <Check size={17} /> You’re ready · Undo
                  </>
                ) : (
                  <>
                    I’m ready to play <ArrowRight size={17} />
                  </>
                )}
              </button>
              <p className="lobby-help" aria-live="polite">
                {myMember?.isReady
                  ? 'All set. The game starts when your opponent is ready.'
                  : 'The game starts automatically when both players are ready.'}
              </p>
              <button
                type="button"
                onClick={handleLeave}
                className="text-button"
              >
                Leave lobby
              </button>
            </div>
          </section>
          <aside className="invite-card">
            <Link2 size={24} strokeWidth={1.5} aria-hidden="true" />
            <h2>
              Good games
              <br />
              are worth sharing.
            </h2>
            <p>
              Send this private invite to a friend. All they need is an account
              and a little competitive spirit.
            </p>
            <label htmlFor="invite-url" className="sr-only">
              Lobby invite link
            </label>
            <input
              id="invite-url"
              className="invite-url"
              readOnly
              value={window.location.href}
              onFocus={(event) => event.target.select()}
            />
            <button
              type="button"
              className="button-secondary"
              onClick={handleCopyInvite}
            >
              {copyState === 'copied' ? (
                <Check size={15} />
              ) : (
                <Copy size={15} />
              )}
              {copyState === 'copied' ? 'Invite copied!' : 'Copy invite link'}
            </button>
            <span
              role="status"
              className="mt-3 text-xs leading-5 text-parchment-500"
            >
              {copyState === 'error'
                ? 'Select the link above to copy it manually.'
                : copyState === 'copied'
                  ? 'Ready to send to your next rival.'
                  : ''}
            </span>
          </aside>
        </div>
        <p className="lobby-footnote">
          <Users size={14} aria-hidden="true" /> Private lobby · Just you and
          your opponent
        </p>
      </div>
    </AppShell>
  );
}
