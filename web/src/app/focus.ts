// Work to do once each time the page comes back into focus (the iPad app back in front, a plugin window, a browser
// tab): things another program may have changed meanwhile, such as a value another BlokDust set, or later the newest
// version on the server. Becoming visible and getting focus usually arrive together: one run for the pair. No timers.
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
