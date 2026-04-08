import { useState, useEffect, useRef } from "react";

export default function useCountdown(
  isRunning: boolean,
  durationMs: number,
  resetKey: number,
  initialTimeMs?: number,
): number {
  // Always match SSR (durationMs); restored time is applied via effect below.
  const [timeLeft, setTimeLeft] = useState(durationMs);
  const prevResetKeyRef = useRef(resetKey);

  // Apply restored time after mount. Using a ref avoids Strict Mode double-fire
  // overwriting the value — the restored value stays correct either way.
  useEffect(() => {
    if (initialTimeMs !== undefined) {
      setTimeLeft(initialTimeMs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset to full duration only when resetKey actually changes (new level).
  // Using a ref comparison instead of the mounted-flag trick so Strict Mode
  // double-invocation doesn't accidentally trigger a reset on initial mount.
  useEffect(() => {
    if (prevResetKeyRef.current !== resetKey) {
      prevResetKeyRef.current = resetKey;
      setTimeLeft(durationMs);
    }
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
