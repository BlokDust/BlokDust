/** Visual-only per-block star position for Void (v1 RandomStarPos), seeded by block id so it is stable. */
export function starPos(id: number): { x: number; y: number } {
  let s = (id * 2654435761) >>> 0;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const x = Math.round(r() * 10), y = Math.round(r() * (10 - x));
  return { x: r() < 0.5 ? -x : x, y: r() < 0.5 ? -y : y };
}
