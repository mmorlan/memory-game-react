import { useState, useEffect } from "react";

export default function useStopwatch(isRunning, startTime, endTime) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [isRunning]);

  if (endTime) return endTime - startTime;
  if (!startTime) return 0;
  return now - startTime;
}
