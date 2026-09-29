import { ArrowUpRight, CornerUpLeft, LogOut, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import {
  type Game,
  GameSchema,
  LobbyIDSchema,
  type UserID,
} from '@lithello/shared';
import { MatchHistory } from '../components/MatchHistory';
import { AppShell } from '../components/AppShell';
import { BoardArtwork } from '../components/BoardArtwork';
import { RulesButton } from '../components/RulesButton';
import { authClient } from '../lib/auth-client';

// The wire carries bitboards as hex and dates as strings, so decoding is what
// turns the payload into Games.
const GameHistoryResponseSchema = z.object({
  games: z.array(GameSchema),
});

const NewLobbyResponseSchema = z.object({
  lobbyId: LobbyIDSchema,
});

export function HomeView() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [isCreating, setIsCreating] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [historyStatus, setHistoryStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [historyAttempt, setHistoryAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.VITE_API_URL}/game`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('Could not load matches');
        return response.json();
      })
      .then((data: unknown) => {
        // safeParse runs the codec's decode direction, so hex becomes bigint
        // and date strings become Dates.
        const parsed = GameHistoryResponseSchema.safeParse(data);
        if (parsed.success) {
          setGames(parsed.data.games);
          setHistoryStatus('ready');
        } else {
          setHistoryStatus('error');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setHistoryStatus('error');
      });
    return () => controller.abort();
  }, [historyAttempt]);

  async function handleCreateLobby() {
    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/lobby/new`,
        {
          method: 'POST',
          credentials: 'include',
        },
      );

      if (!response.ok) {
        setCreateError('Could not create a lobby. Please try again.');
        return;
      }

      const parsed = NewLobbyResponseSchema.safeParse(await response.json());

      if (!parsed.success) {
        setCreateError('The server sent an unexpected response.');
        return;
      }

      navigate(`/lobby/${parsed.data.lobbyId}`);
    } catch {
      setCreateError('Could not reach the server. Check your connection.');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    setSignOutError(null);

    try {
      const { error } = await authClient.signOut();

      if (error) {
        setSignOutError(
          error.message ?? 'Could not sign out. Please try again.',
        );
        return;
      }

      navigate('/signin', { replace: true });
    } catch {
      setSignOutError('Could not reach the server. Check your connection.');
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <AppShell
      actions={
        <>
          <span
            className="user-avatar"
            role="img"
            aria-label={session?.user.name || 'Your profile'}
          >
            {session?.user.name.slice(0, 1).toUpperCase()}
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="text-button"
            aria-label={isSigningOut ? 'Signing out' : 'Sign out'}
          >
            <LogOut size={15} />
            <span className="signout-label">
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </span>
          </button>
        </>
      }
    >
      <div className="page-heading">
        <div>
          <span className="eyebrow accent-text">THE CLUBHOUSE</span>
          <h1 className="display-heading">
            Your move, {session?.user.name.trim().split(/\s+/)[0] || 'friend'}.
          </h1>
        </div>
        <p>
          A familiar game. A fresh challenge.
          <br />
          Pull up a chair and make it a good one.
        </p>
      </div>
      {signOutError && (
        <p role="alert" className="error-notice mb-5">
          {signOutError}
        </p>
      )}
      <section className="hero-card" aria-labelledby="play-heading">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="status-dot" /> BETTER WITH A FRIEND
          </span>
          <h2 id="play-heading">
            Small board.
            <br />
            <em>Big possibilities.</em>
          </h2>
          <p>
            A friendly rivalry is one invite away. Start a private lobby, share
            the link, and let the good games begin.
          </p>
          <button
            type="button"
            onClick={handleCreateLobby}
            disabled={isCreating}
            className="button-primary"
          >
            <Plus size={17} />
            {isCreating ? 'Setting your table…' : 'Create a lobby'}
            <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="hero-art">
          <BoardArtwork compact />
        </div>
      </section>
      {createError && (
        <p role="alert" className="error-notice mt-4">
          {createError}
        </p>
      )}
      <div className="dashboard-grid">
        <section aria-labelledby="history-heading">
          <div className="section-heading">
            <h2 id="history-heading">Your recent matches</h2>
            <span>
              {games.length > 0
                ? `${games.length} ${games.length === 1 ? 'match' : 'matches'}`
                : 'YOUR STORY SO FAR'}
            </span>
          </div>
          {historyStatus === 'loading' ? (
            <div role="status" className="empty-history">
              <span className="mini-discs mb-4" aria-hidden="true">
                <i />
                <i />
              </span>
              <p>Gathering your games…</p>
            </div>
          ) : historyStatus === 'error' ? (
            <div className="empty-history">
              <h3>Couldn’t load your matches.</h3>
              <p>Let’s give that another try.</p>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setHistoryStatus('loading');
                  setHistoryAttempt((attempt) => attempt + 1);
                }}
              >
                Try again <ArrowUpRight size={14} />
              </button>
            </div>
          ) : (
            <MatchHistory
              games={games}
              viewerId={session?.user.id as UserID}
            />
          )}
        </section>
        <aside className="tip-card">
          <span className="eyebrow">
            <CornerUpLeft size={14} /> A LITTLE INSIDE KNOWLEDGE
          </span>
          <h3>Play the long game.</h3>
          <p>
            More discs doesn’t always mean you’re ahead. Claim the corners—they
            can’t be flipped. Sometimes, less really is more.
          </p>
          <RulesButton />
        </aside>
      </div>
    </AppShell>
  );
}
