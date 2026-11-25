// How long a video runs (SPEC-SHARING-VIDEO-EXPORT R5): whole cycles of the patch's longest timer
// (synced turns and divisions, LFO rates, Counter cycles), clamped; DEFAULT_SECONDS without timers.
export const MIN_SECONDS = 10,
  MAX_SECONDS = 30,
  DEFAULT_SECONDS = 15;

export interface TimedBlock {
  type: string;
  params: Record<string, unknown>;
}

export function videoSeconds(
  blocks: TimedBlock[],
  bpm: number,
  defaultOf: (type: string, key: string) => unknown,
): number {
  const beat = 60 / (bpm > 0 ? bpm : 120);
  const num = (b: TimedBlock, k: string) => Number(b.params[k] ?? defaultOf(b.type, k)) || 0;
  const on = (b: TimedBlock, k: string) => {
    const value = b.params[k] ?? defaultOf(b.type, k);
    return value === true || value === 1 || value === '1' || value === 'true';
  };
  const periods: number[] = [],
    ticks: number[] = [];
  for (const b of blocks) {
    if (b.type === 'power.laser' && on(b, 'sync') && num(b, 'turnBeats'))
      periods.push(Math.abs(num(b, 'turnBeats')) * beat);
    if (b.type === 'power.emitter' && on(b, 'sync')) ticks.push(num(b, 'division') * beat);
    if (b.type === 'power.pulse' && on(b, 'sync')) ticks.push(num(b, 'pulseBeats') * beat);
    if (b.type === 'fx.lfo')
      periods.push(on(b, 'sync') ? num(b, 'division') * beat : 1 / Math.max(0.02, num(b, 'rate')));
  }
  const tick = Math.min(beat, ...ticks.filter((tick) => tick > 0));
  for (const b of blocks)
    if (b.type === 'power.counter') periods.push(Math.max(1, num(b, 'steps')) * tick);
  periods.push(...ticks);
  const longest = Math.max(0, ...periods.filter((period) => Number.isFinite(period) && period > 0));
  if (!longest) return DEFAULT_SECONDS;
  const seconds = Math.min(MAX_SECONDS, Math.ceil(MIN_SECONDS / longest - 1e-9) * longest);
  return Math.round(seconds * 30) / 30; // a whole number of 30 fps frames
}
