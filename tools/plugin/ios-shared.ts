// What the Simulator test (ios.ts) and the real iPad (ios-device.ts) share.
import { spawnSync } from 'node:child_process';

export const OUT = '.cache/ios-host';
export const APP_ID = 'com.funputs.blokdust';
export const run = (cmd: string, args: string[], quiet = false) =>
  spawnSync(cmd, args, { encoding: 'utf8', stdio: quiet ? 'pipe' : ['ignore', 'inherit', 'inherit'], maxBuffer: 64 << 20 });
export const must = (r: ReturnType<typeof run>, what: string) => { if (r.status !== 0) throw new Error(`${what} failed${r.stderr ? `: ${r.stderr.slice(-2000)}` : ''}`); return r; };
