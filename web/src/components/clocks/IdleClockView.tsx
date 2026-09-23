import { formatClockTime } from "../../util/clock.ts";
import { ClockView } from "./ClockView.tsx";

interface IdleClockViewProps {
  clockTimeMilliseconds: number;
}

export function IdleClockView({ clockTimeMilliseconds }: IdleClockViewProps) {
  return <ClockView clockText={formatClockTime(clockTimeMilliseconds)} disabled />;
}
