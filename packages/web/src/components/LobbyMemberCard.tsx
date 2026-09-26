import { Crown } from 'lucide-react';
import type { LobbyMember } from '@lithello/shared';

export function LobbyMemberCard({
  member,
  isHost,
}: {
  member: LobbyMember;
  isHost: boolean;
}) {
  const isConnected = member.connection.status === 'connected';

  return (
    <div className="flex items-center justify-between rounded-lg border border-cream-200 bg-cream-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-center gap-2">
        {isHost && <Crown size={18} className="text-blue-muted" />}
        <span
          className={
            isConnected
              ? 'text-ink dark:text-neutral-100'
              : 'text-neutral-400 dark:text-neutral-600'
          }
        >
          {member.name}
        </span>
      </div>

      {!isConnected ? (
        <span className="text-sm font-medium text-red-600">DISCONNECTED</span>
      ) : member.isReady ? (
        <span className="text-sm font-medium text-green-600">Ready</span>
      ) : (
        <span className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
          Unready
        </span>
      )}
    </div>
  );
}
