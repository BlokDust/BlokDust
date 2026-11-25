// Running totals for Settings › ACCOUNT (SPEC-SHARING-ACCOUNTS R16): play time, blocks, particles,
// laser turns (estimated). Unsent totals wait in localStorage for the next save or the page close.

export interface Activity {
  playMs: number;
  blocks: number;
  particles: number;
  laserTurns: number;
}
export const NO_ACTIVITY: Activity = { playMs: 0, blocks: 0, particles: 0, laserTurns: 0 };
const KEY = 'bd_activity';
/** Snapshot gaps longer than this (a hidden tab, a stall) count as this long. */
const MAX_STEP_MS = 250;
/** v1's frame rate: the Emitter's Rate and the Laser's Rotate are per v1 frame. */
const V1_FPS = 60;

export interface TallyBlock {
  type: string;
  params: Record<string, unknown>;
}
export interface TallyFrame {
  blocks: Iterable<[number, TallyBlock]>;
  /** Ids of the blocks powered now (the snapshot's). */
  powered: ReadonlySet<number>;
  /** The POWER switch: off, nothing emits or turns. */
  worldOn: boolean;
  tempo: number;
  /** The page is shown (time played counts only then). */
  visible: boolean;
  /** Particles the engine emitted since the last frame (owner, 2026-11-16: every particle counts,
   * not an estimate). */
  emitted: number;
}

const num = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const on = (value: unknown) => value === true || value === 1 || value === 'true';
const add = (a: Activity, b: Activity): Activity => ({
  playMs: a.playMs + b.playMs,
  blocks: a.blocks + b.blocks,
  particles: a.particles + b.particles,
  laserTurns: a.laserTurns + b.laserTurns,
});
const sub = (a: Activity, b: Activity): Activity => ({
  playMs: Math.max(0, a.playMs - b.playMs),
  blocks: Math.max(0, a.blocks - b.blocks),
  particles: Math.max(0, a.particles - b.particles),
  laserTurns: Math.max(0, a.laserTurns - b.laserTurns),
});
export const isEmpty = (a: Activity) =>
  a.playMs < 1000 && !a.blocks && a.particles < 1 && a.laserTurns < 0.01;
/** Whole numbers for the server (it keeps integers); fractions stay here for next time. */
export const whole = (a: Activity): Activity => ({
  playMs: Math.floor(a.playMs),
  blocks: Math.floor(a.blocks),
  particles: Math.floor(a.particles),
  laserTurns: Math.floor(a.laserTurns * 100) / 100,
});

/** Particles and turns per second for one block now (estimates from its params, R16). */
export function rates(
  b: TallyBlock,
  powered: boolean,
  tempo: number,
): { particles: number; turns: number } {
  const params = b.params,
    beatsPerSec = tempo / 60;
  if (b.type === 'power.emitter') {
    if (!powered && !on(params.selfPoweredMode)) return { particles: 0, turns: 0 };
    const perSec = on(params.sync)
      ? beatsPerSec / Math.max(1 / 64, Math.abs(num(params.division, 1)))
      : V1_FPS / Math.max(1, Math.round(num(params.rate, 80)));
    return { particles: perSec, turns: 0 };
  }
  if (b.type === 'power.laser') {
    // As the engine: synced turns while running; otherwise Rotate turns it only while powered (v1).
    if (on(params.sync))
      return {
        particles: 0,
        turns:
          powered || on(params.selfPoweredMode)
            ? beatsPerSec / Math.max(0.25, Math.abs(num(params.turnBeats, 4)))
            : 0,
      };
    return {
      particles: 0,
      turns: powered ? ((Math.abs(Math.round(num(params.rotate, 0))) / 100) * V1_FPS) / 360 : 0,
    };
  }
  return { particles: 0, turns: 0 };
}

export class ActivityTally {
  /** Counted in this page and not yet kept in localStorage. */
  private fresh: Activity = { ...NO_ACTIVITY };
  private last = 0;
  private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null;
  constructor(storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeStorage()) {
    this.storage = storage;
  }

  /** A snapshot arrived (`now`: performance.now()). */
  frame(now: number, tallyFrame: TallyFrame): void {
    const dt = this.last ? Math.min(MAX_STEP_MS, Math.max(0, now - this.last)) : 0;
    this.last = now;
    this.fresh.particles += tallyFrame.emitted;
    if (!dt) return;
    if (tallyFrame.visible) this.fresh.playMs += dt;
    if (!tallyFrame.worldOn) return;
    for (const [id, b] of tallyFrame.blocks) {
      if (b.type !== 'power.laser') continue;
      this.fresh.laserTurns +=
        (rates(b, tallyFrame.powered.has(id), tallyFrame.tempo).turns * dt) / 1000;
    }
  }
  /** The user added a block (from the menu, a paste or a duplicate; not opening a patch). */
  blockAdded(count = 1): void {
    this.fresh.blocks += count;
  }

  private stored(): Activity {
    try {
      const activity = JSON.parse(this.storage?.getItem(KEY) ?? 'null') as Activity | null;
      return activity ? { ...NO_ACTIVITY, ...activity } : { ...NO_ACTIVITY };
    } catch {
      return { ...NO_ACTIVITY };
    }
  }
  private store(a: Activity): void {
    try {
      this.storage?.setItem(KEY, JSON.stringify(a));
    } catch {
      /* private mode: kept in memory only */
    }
  }
  /** Move this page's count into localStorage (the page is hidden; other tabs add to the same
   * store). */
  keep(): void {
    this.store(add(this.stored(), this.fresh));
    this.fresh = { ...NO_ACTIVITY };
  }
  /** Everything not yet sent: this page's and the stored. */
  pending(): Activity {
    return add(this.stored(), this.fresh);
  }
  /** What to send now (whole numbers), or null when there is nothing worth a request. */
  toSend(): Activity | null {
    this.keep();
    const a = whole(this.stored());
    return isEmpty(a) ? null : a;
  }
  /** The server added `a`: take it off what is waiting. */
  sent(a: Activity): void {
    this.keep();
    this.store(sub(this.stored(), a));
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** This page's tally (the web app; the plugin and embeds don't count). */
export const activity = new ActivityTally();
