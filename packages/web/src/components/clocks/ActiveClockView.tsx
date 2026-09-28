import { useEffect, useRef, useState } from 'react';
import { formatClockTime } from '../../lib/clock';
import { ClockView } from './ClockView';

export function ActiveClockView({ expiresAt }: { expiresAt: Date }) {
  const expiryMs = useRef(expiresAt.getTime());
  const animationRef = useRef<number>(undefined);

  const [clockText, setClockText] = useState(() =>
    formatClockTime(Math.max(0, expiresAt.getTime() - Date.now())),
  );

  useEffect(() => {
    expiryMs.current = expiresAt.getTime();
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
      if (animationRef.current !== undefined) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return <ClockView clockText={clockText} />;
}
