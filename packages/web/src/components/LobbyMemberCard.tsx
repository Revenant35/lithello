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
    <div className="flex items-center justify-between rounded-lg border border-wood-700 bg-wood-900 px-4 py-3">
      <div className="flex items-center gap-2">
        {isHost && <Crown size={18} className="text-brass-400" />}
        <span className={isConnected ? 'text-parchment-50' : 'text-parchment-500'}>
          {member.name}
        </span>
      </div>

      {!isConnected ? (
        <span className="text-sm font-medium text-ember-500">DISCONNECTED</span>
      ) : member.isReady ? (
        <span className="text-sm font-medium text-moss-500">Ready</span>
      ) : (
        <span className="text-sm font-medium text-parchment-500">Not ready</span>
      )}
    </div>
  );
}
