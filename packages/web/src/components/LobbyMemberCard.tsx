import { Crown } from 'lucide-react';
import type { LobbyMember } from '@lithello/shared';

export function LobbyMemberCard({
  member,
  isHost,
}: {
  member: LobbyMember;
  isHost: boolean;
}) {
  const isConnected = member.isConnected;

  return (
    <div className="member-card">
      <span className="user-avatar" aria-hidden="true">
        {member.name.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className={isConnected ? 'text-parchment-50' : 'text-parchment-500'}>
          <span className="member-name">{member.name}</span>
        </p>
        <span className="member-detail">
          {isHost && <Crown size={11} aria-hidden="true" />}
          {isHost ? 'Your host' : 'The challenger'}
        </span>
      </div>

      {!isConnected ? (
        <span className="member-status text-ember-500">Offline</span>
      ) : member.isReady ? (
        <span className="member-status text-moss-500">● Ready</span>
      ) : (
        <span className="member-status text-parchment-500">Not ready</span>
      )}
    </div>
  );
}
