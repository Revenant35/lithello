import { createContext, use } from 'react';
import type { Player } from '@lithello/shared';

export type PlayerContextValue = {
  player: Player | null;
  setPlayer: (player: Player) => void;
};

export const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const value = use(PlayerContext);

  if (value === null) {
    throw new Error('usePlayer must be used inside PlayerProvider');
  }

  return value;
}
