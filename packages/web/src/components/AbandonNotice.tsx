import { useCountdown } from '../lib/use-countdown';

/**
 * Shown under a disconnected player. `abandonsAt` is server-set, so the
 * countdown is the same one the sweep is working to.
 */
export function AbandonNotice({ abandonsAt }: { abandonsAt: Date | null }) {
  const secondsLeft = useCountdown(abandonsAt);

  return (
    <small role="status" className="block text-ember-500">
      {abandonsAt === null || secondsLeft === 0
        ? 'Disconnected.'
        : `Disconnected. Abandoning in ${secondsLeft}s…`}
    </small>
  );
}
