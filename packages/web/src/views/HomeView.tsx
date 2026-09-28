import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

export function HomeView() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

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
    <div className="flex min-h-svh items-center justify-center bg-wood-950">
      <button
        type="button"
        onClick={handleCreateLobby}
        disabled={isCreating}
        className="flex items-center gap-2 rounded-lg bg-brass-400 px-4 py-2 font-medium text-wood-950 transition-colors hover:enabled:bg-brass-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus size={18} />
        New Lobby
      </button>
    </div>
  );
}
