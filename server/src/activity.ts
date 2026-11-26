// Running totals (SPEC-SHARING-ACCOUNTS R16): browser estimates, added on save or page close
// (ACTIVITY_BEACON=off spares D1 writes); only sane limits, as only their owner sees them.
import type { Env } from './env.ts';
import { HttpError } from './http.ts';

export interface Activity {
  playMs: number;
  blocks: number;
  particles: number;
  laserTurns: number;
}
/** Most that one request may add (a day of play; past these it is clamped, not refused). */
const MAX: Activity = {
  playMs: 24 * 3_600_000,
  blocks: 10_000,
  particles: 10_000_000,
  laserTurns: 1_000_000,
};

/** The activity in a request body, clamped; null when there is none. */
export function readActivity(input: unknown): Activity | null {
  if (!input || typeof input !== 'object') return null;
  const fields = input as Record<string, unknown>,
    out = {} as Activity;
  for (const k of Object.keys(MAX) as (keyof Activity)[]) {
    const count = fields[k];
    out[k] =
      typeof count === 'number' && Number.isFinite(count)
        ? Math.min(
            MAX[k],
            Math.max(0, k === 'laserTurns' ? Math.round(count * 100) / 100 : Math.floor(count)),
          )
        : 0;
  }
  return out.playMs || out.blocks || out.particles || out.laserTurns ? out : null;
}

export const beaconOn = (env: Env) => (env.ACTIVITY_BEACON ?? 'on') !== 'off';

/** Add `a` to the account (one write). */
export function addActivity(env: Env, userId: string, a: Activity): D1PreparedStatement {
  return env.DB.prepare(
    'UPDATE users SET play_ms = play_ms + ?, blocks_added = blocks_added + ?, particles = particles + ?, laser_turns = laser_turns + ? WHERE id = ?',
  ).bind(a.playMs, a.blocks, a.particles, a.laserTurns, userId);
}

export async function parseBody(req: Request): Promise<unknown> {
  const body = await req.text();
  if (body.length > 1024) throw new HttpError(413, 'request too large');
  try {
    return JSON.parse(body || '{}');
  } catch {
    throw new HttpError(400, 'body must be JSON');
  }
}
