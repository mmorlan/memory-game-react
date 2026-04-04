import { useState, useEffect, useRef } from "react";

export default function useCountdown(
  isRunning: boolean,
  durationMs: number,
  resetKey: number,
  initialTimeMs?: number,
): number {
  const [timeLeft, setTimeLeft] = useState(initialTimeMs ?? durationMs);
  const mounted = useRef(false);

  // Skip the effect on initial mount so initialTimeMs is preserved;
  // subsequent resetKey changes (new level) reset to full durationMs.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setTimeLeft(durationMs);
  }, [resetKey, durationMs]);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 100));
    }, 100);
    return () => clearInterval(id);
  }, [isRunning]);

  return timeLeft;
}
