// The Simulator's log of the app and its extensions, and waiting for a line in it.
import { run } from './ios-shared.ts';
import { sleep } from './ios-paths.ts';

export const logTime = (date: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
};

export const appLog = (udid: string, since: Date, subsystem = 'com.funputs.blokdust') =>
  run(
    'xcrun',
    [
      'simctl',
      'spawn',
      udid,
      'log',
      'show',
      '--start',
      logTime(since),
      '--style',
      'compact',
      '--predicate',
      `subsystem == "${subsystem}"`,
    ],
    true,
  ).stdout;

/** Waits up to `seconds` for every pattern to appear in the plugin's (or `subsystem`'s) log since `since`. */
export function waitForLog(
  udid: string,
  since: Date,
  patterns: RegExp[],
  seconds: number,
  subsystem?: string,
): string {
  let log = '';
  for (let i = 0; i < seconds; ++i) {
    log = appLog(udid, since, subsystem);
    if (patterns.every((pattern) => pattern.test(log))) break;
    sleep(1000);
  }
  return log;
}
