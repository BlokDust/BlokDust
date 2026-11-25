// Work for each return of focus (iPad app, plugin window, browser tab): what another program may
// have changed meanwhile. Visible and focus usually arrive together: one run for both, no timers.
const jobs: (() => void)[] = [];
let last = -Infinity;

function run(): void {
  if (performance.now() - last < 1000) return;
  last = performance.now();
  for (const job of jobs) job();
}

export function onFocusReturn(job: () => void): void {
  if (!jobs.length) {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') run();
    });
    window.addEventListener('focus', run);
  }
  jobs.push(job);
}
