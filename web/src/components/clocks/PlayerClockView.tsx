import type { Clock } from "@lithello/shared/types";
import { ActiveClockView } from "./ActiveClockView.tsx";
import { IdleClockView } from "./IdleClockView.tsx";

interface PlayerClockViewProps {
  clock: Clock;
}

export function PlayerClockView({ clock }: PlayerClockViewProps) {
  if (clock.kind === "active") {
    return <ActiveClockView expiresAt={clock.expiresAt} />;
  } else {
    return <IdleClockView clockTimeMilliseconds={clock.clockTimeMilliseconds} />;
  }
}
