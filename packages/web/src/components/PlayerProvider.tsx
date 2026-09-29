import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { type Player, PlayerSchema } from '@lithello/shared';
import { z } from 'zod';
import { PlayerContext } from '../lib/player-context';
import { LoadingView } from './LoadingView';

const PlayerResponseSchema = z.object({
  player: PlayerSchema.nullable(),
});

/**
 * A layout route that loads the signed-in user's player record once, so the
 * guards below it can decide without refetching on every navigation.
 *
 * Renders nothing until the answer is known - otherwise a route would briefly
 * see `player: null` and bounce the user to onboarding they do not need.
 */
export function PlayerProvider() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${import.meta.env.VITE_API_URL}/player/me`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('Could not load your player profile');
        return response.json();
      })
      .then((data: unknown) => {
        const parsed = PlayerResponseSchema.safeParse(data);

        if (!parsed.success) {
          setStatus('error');
          return;
        }

        setPlayer(parsed.data.player);
        setStatus('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error');
      });

    return () => controller.abort();
  }, [attempt]);

  if (status === 'loading') {
    return <LoadingView />;
  }

  if (status === 'error') {
    return (
      <div className="empty-history">
        <h3>We couldn’t load your profile.</h3>
        <p>Something went wrong reaching the server.</p>
        <button type="button" onClick={retry} className="button-primary mt-4">
          Try again
        </button>
      </div>
    );
  }

  return (
    <PlayerContext value={{ player, setPlayer }}>
      <Outlet />
    </PlayerContext>
  );
}
