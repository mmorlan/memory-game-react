export function getTimeMultiplier(ms: number): number {
  if (ms < 3_000) return 5;
  if (ms < 10_000) return 3;
  if (ms < 20_000) return 2;
  if (ms < 35_000) return 1.5;
  if (ms < 50_000) return 1.2;
  return 1;
}

// Score for a single matched pair.
// totalPairs: total pairs in the grid (for PM)
// timeToPairMs: ms elapsed since the last match (or game start)
// ldm: Level Difficulty Multiplier (1 = freeplay / survival level 1, 1.5 = level 2, 2 = level 3)
export function calcPairScore(totalPairs: number, timeToPairMs: number, ldm = 1): number {
  const pm = totalPairs / 8;
  const tm = getTimeMultiplier(timeToPairMs);
  return Math.round(100 * pm * tm * ldm);
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
