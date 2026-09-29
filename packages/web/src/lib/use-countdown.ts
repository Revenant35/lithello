import { useEffect, useState } from 'react';

/**
 * Whole seconds until `target`, or 0 once it has passed. A null target means
 * there is nothing to wait for.
 *
 * The value is derived during render; the interval exists only while a
 * countdown is actually running and stops itself once it reaches zero.
 */
export function useCountdown(target: Date | null): number {
  const targetMs = target?.getTime() ?? null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (targetMs === null || targetMs <= Date.now()) {
      return;
    }

    const interval = setInterval(() => {
      setNow(Date.now());

      if (Date.now() >= targetMs) {
        clearInterval(interval);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [targetMs]);

  if (targetMs === null) {
    return 0;
  }

  return Math.max(0, Math.ceil((targetMs - now) / 1000));
}
