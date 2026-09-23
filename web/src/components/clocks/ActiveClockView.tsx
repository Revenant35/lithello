import { useEffect, useRef, useState } from "react";
import { formatClockTime } from "../../util/clock.ts";
import { ClockView } from "./ClockView.tsx";

interface ActiveClockViewProps {
  expiresAt: string;
}

export function ActiveClockView({ expiresAt }: ActiveClockViewProps) {
  const expiryMs = useRef(new Date(expiresAt).getTime());
  const animationRef = useRef<number>(undefined);

  const [clockText, setClockText] = useState(() =>
    formatClockTime(Math.max(0, new Date(expiresAt).getTime() - Date.now())),
  );

  useEffect(() => {
    expiryMs.current = new Date(expiresAt).getTime();
  }, [expiresAt]);

  useEffect(() => {
    function tick() {
      const remaining = Math.max(0, expiryMs.current - Date.now());
      const text = formatClockTime(remaining);
      setClockText((prev) => (prev === text ? prev : text));
      animationRef.current = requestAnimationFrame(tick);
    }

    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current !== undefined) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return <ClockView clockText={clockText} />;
}
