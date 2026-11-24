// How long a video runs (owner review 2, 2026-11-15: "15 seconds is so arbitrary"): whole cycles of the patch's
// longest timer, at least MIN_SECONDS and at most MAX_SECONDS. Timers are the tempo-synced ones (Laser turn, Particle
// Emitter and Pulse divisions, LFO division) and an LFO's free rate; a Counter repeats after its steps of the
// shortest of those ticks (or a beat). A patch without timers gets DEFAULT_SECONDS. (SPEC-SHARING-VIDEO-EXPORT R5.)
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
    const v = b.params[k] ?? defaultOf(b.type, k);
    return v === true || v === 1 || v === '1' || v === 'true';
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
  const tick = Math.min(beat, ...ticks.filter((t) => t > 0));
  for (const b of blocks)
    if (b.type === 'power.counter') periods.push(Math.max(1, num(b, 'steps')) * tick);
  periods.push(...ticks);
  const longest = Math.max(0, ...periods.filter((p) => Number.isFinite(p) && p > 0));
  if (!longest) return DEFAULT_SECONDS;
  const s = Math.min(MAX_SECONDS, Math.ceil(MIN_SECONDS / longest - 1e-9) * longest);
  return Math.round(s * 30) / 30; // a whole number of 30 fps frames
}
