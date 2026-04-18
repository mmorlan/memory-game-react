// Thresholds are proportional to the timer duration (t = 7.5s × pairs) so multiplier
// windows scale consistently across all grid sizes. The 1.2× tier has been removed.
export function getTimeMultiplier(ms: number, totalPairs: number): number {
  const t = 7.5 * totalPairs * 1000; // timer duration in ms
  if (ms < t / 20)  return 5;
  if (ms < t / 6)   return 3;
  if (ms < t / 3)   return 2;
  if (ms < t / 1.5) return 1.5;
  return 1;
}

// Score for a single matched pair.
// totalPairs: total pairs in the grid (for PM and threshold scaling)
// elapsedMs: ms elapsed since game/level start at the moment of the match
// ldm: Level Difficulty Multiplier (1 = freeplay / survival level 1, 1.5 = level 2, 2 = level 3)
export function calcPairScore(totalPairs: number, elapsedMs: number, ldm = 1): number {
  const pm = totalPairs / 8;
  const tm = getTimeMultiplier(elapsedMs, totalPairs);
  return Math.round(100 * pm * tm * ldm);
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
