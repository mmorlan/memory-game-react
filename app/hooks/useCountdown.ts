import { useState, useEffect } from "react";

export default function useCountdown(
  isRunning: boolean,
  durationMs: number,
  resetKey: number,
): number {
  const [timeLeft, setTimeLeft] = useState(durationMs);

  // Reset to full duration whenever resetKey changes
  useEffect(() => {
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
