// The Counter's step pattern (SIMULATION-0005) and a Prism's exits, as the engine computes them.

/** The Counter's pattern (engine gateDecide): which steps let a hit through, from the first. */
export function counterPattern(steps: number, hits: number, rotate: number): boolean[] {
  const count = Math.max(1, Math.min(16, Math.round(steps))),
    hitCount = Math.max(0, Math.min(count, Math.round(hits))),
    rotation = Math.max(0, Math.min(15, Math.round(rotate)));
  return Array.from(
    { length: count },
    (_, i) => (((i + rotation) % count) * hitCount) % count < hitCount,
  );
}
/** A Counter's steps as they play: set by hand (`pattern` ≥ 0, bit k = step k) or Euclidean. */
export function counterSteps(params: Record<string, unknown>): boolean[] {
  const euclid = counterPattern(
      Number(params.steps ?? 8),
      Number(params.hits ?? 3),
      Number(params.rotate ?? 0),
    ),
    mask = Math.round(Number(params.pattern ?? -1));
  return mask >= 0 ? euclid.map((_, k) => ((mask >> k) & 1) === 1) : euclid;
}
/** A Prism's exit directions in degrees (engine traceBeam / R5d), from its angle now. */
export function prismAngles(angle: number, streams: number, spread: number): number[] {
  const count = Math.max(1, Math.min(4, Math.round(streams)));
  return Array.from(
    { length: count },
    (_, k) => angle + (count > 1 ? spread * (k / (count - 1) - 0.5) : 0),
  );
}
