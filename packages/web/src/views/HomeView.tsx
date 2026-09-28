import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { GameSummarySchema, type GameSummary } from '@lithello/shared';
import { MatchHistory } from '../components/MatchHistory';

const GameHistoryResponseSchema = z.object({
  games: z.array(GameSummarySchema),
});

export function HomeView() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [games, setGames] = useState<GameSummary[]>([]);

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

    const response = await fetch(`${import.meta.env.VITE_API_URL}/lobby/new`, {
      method: 'POST',
      credentials: 'include',
    });

    setIsCreating(false);

    if (!response.ok) {
      return;
    }

    const data: { lobbyId: string } = await response.json();
    navigate(`/lobby/${data.lobbyId}`);
  }

  return (
    <div className="flex min-h-svh justify-center bg-wood-950 p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 pt-16">
        <button
          type="button"
          onClick={handleCreateLobby}
          disabled={isCreating}
          className="flex items-center gap-2 rounded-lg bg-brass-400 px-4 py-2 font-medium text-wood-950 transition-colors hover:enabled:bg-brass-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={18} />
          New Lobby
        </button>

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
