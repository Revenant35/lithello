import { formatClockTime } from '../../lib/clock';
import { ClockView } from './ClockView';

export function IdleClockView({
  clockTimeMilliseconds,
}: {
  clockTimeMilliseconds: number;
}) {
  return (
    <ClockView clockText={formatClockTime(clockTimeMilliseconds)} disabled />
  );
}
