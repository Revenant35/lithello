import { LogOut, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import {
  GameSummarySchema,
  LobbyIDSchema,
  type GameSummary,
} from '@lithello/shared';
import { MatchHistory } from '../components/MatchHistory';
import { authClient } from '../lib/auth-client';

const GameHistoryResponseSchema = z.object({
  games: z.array(GameSummarySchema),
});

const NewLobbyResponseSchema = z.object({
  lobbyId: LobbyIDSchema,
});

export function HomeView() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [games, setGames] = useState<GameSummary[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/game/history`, {
      credentials: 'include',
    })
      .then((response) => response.json())
      .then((data: unknown) => {
        const parsed = GameHistoryResponseSchema.safeParse(data);
        if (parsed.success) {
          setGames(parsed.data.games);
        }
      })
      .catch(() => {});
  }, []);

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
    <div className="flex min-h-svh justify-center bg-wood-950 p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 pt-16">
        <div className="flex w-full flex-col items-end gap-2">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-parchment-300 transition-colors hover:enabled:text-parchment-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut size={16} />
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </button>

          {signOutError && (
            <p role="alert" className="text-sm text-ember-500">
              {signOutError}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleCreateLobby}
          disabled={isCreating}
          className="flex items-center gap-2 rounded-lg bg-brass-400 px-4 py-2 font-medium text-wood-950 transition-colors hover:enabled:bg-brass-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={18} />
          New Lobby
        </button>

        {createError && (
          <p role="alert" className="text-sm text-ember-500">
            {createError}
          </p>
        )}

        <div className="flex w-full flex-col gap-3">
          <h2 className="text-sm font-bold tracking-wide text-parchment-500 uppercase">
            Recent matches
          </h2>
          <MatchHistory games={games} />
        </div>
      </div>
    </div>
  );
}
