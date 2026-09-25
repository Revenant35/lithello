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
    <div className="flex min-h-svh items-center justify-center bg-cream-50 dark:bg-neutral-900">
      <button
        type="button"
        onClick={handleCreateLobby}
        disabled={isCreating}
        className="flex items-center gap-2 rounded-lg bg-blue-muted px-4 py-2 font-medium text-white transition-colors hover:enabled:bg-blue-muted-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus size={18} />
        New Lobby
      </button>
    </div>
  );
}
