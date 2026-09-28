import type { GameClock } from '@lithello/shared';
import { ActiveClockView } from './ActiveClockView';
import { IdleClockView } from './IdleClockView';

export function PlayerClockView({ clock }: { clock: GameClock }) {
  if (clock.kind === 'active') {
    return <ActiveClockView expiresAt={clock.expiresAt} />;
  }

  return <IdleClockView clockTimeMilliseconds={clock.clockTimeMilliseconds} />;
}
