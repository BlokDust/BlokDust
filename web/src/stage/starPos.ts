/** Visual-only per-block star position for Void (v1 RandomStarPos), seeded by block id: stable. */
export function starPos(id: number): { x: number; y: number } {
  let seed = (id * 2654435761) >>> 0;
  const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const x = Math.round(random() * 10),
    y = Math.round(random() * (10 - x));
  return { x: random() < 0.5 ? -x : x, y: random() < 0.5 ? -y : y };
}
