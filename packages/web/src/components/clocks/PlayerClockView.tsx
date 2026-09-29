import { ActiveClockView } from './ActiveClockView';
import { IdleClockView } from './IdleClockView';

/**
 * `expiresAt` is set only for the side on the clock. The idle side shows its
 * stored remaining time, which does not tick.
 */
export function PlayerClockView({
  remainingMs,
  expiresAt,
}: {
  remainingMs: number;
  expiresAt?: Date;
}) {
  if (expiresAt) {
    return <ActiveClockView expiresAt={expiresAt} />;
  }

  return <IdleClockView clockTimeMilliseconds={remainingMs} />;
}
