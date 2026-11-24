// Usage analytics and error reports for a page session (SHARING-0010): the website and embeds.
import { flushAnalytics, hostOf, pageRate, startAnalytics, track } from '../../analytics/client.ts';
import { startSentry } from '../../analytics/sentry.ts';
import { embedId, juce, start } from './page.ts';

/** Session totals for session_summary (sent when the page goes). */
export const usage = { blocksMax: 0, blocksDeleted: 0, undos: 0, keys: false, midi: false };

/** The page that embeds this one, if the browser says (Chrome and Safari do). */
function embeddingPage(): string | undefined {
  const origins = (location as { ancestorOrigins?: DOMStringList }).ancestorOrigins;
  return origins && origins.length > 0 ? origins[0] : undefined;
}

// The plugin's page has no Worker: its daily ping is native (R8). Off at rate 0, or by choice (R7).
export function startSessionAnalytics(): void {
  if (juce) return;
  const surface = embedId ? 'embed' : 'web';
  void startSentry(surface).catch(() => {
    /* no error reports: nothing to do */
  });
  if (!startAnalytics(surface, pageRate())) return;
  track('session_start', {
    referrer: embedId ? undefined : hostOf(document.referrer),
    embed_host: embedId ? hostOf(embeddingPage() ?? document.referrer) : undefined,
  } as Record<string, string>);
  if (typeof WebAssembly === 'undefined') track('wasm_unsupported');
  if (start.source) track('patch_opened', { source: start.source });
}

export function sendSummaryWhenPageGoes(): void {
  addEventListener('pagehide', () => {
    track('session_summary', undefined, {
      seconds: Math.round(performance.now() / 1000),
      blocks_max: usage.blocksMax,
      blocks_deleted: usage.blocksDeleted,
      undos: usage.undos,
    });
    flushAnalytics(true);
  });
}

const FPS_WINDOW_MS = 10_000;

/** The frame rate over the first 10 s of running, as a bucket (SPEC-SHARING-USAGE-ANALYTICS). */
export function measureFps(): void {
  let frames = 0;
  const startedAt = performance.now();
  const countFrame = () => {
    frames++;
    const elapsed = performance.now() - startedAt;
    if (elapsed < FPS_WINDOW_MS) {
      requestAnimationFrame(countFrame);
      return;
    }
    if (document.visibilityState !== 'visible') return; // a hidden tab says nothing about speed
    const fps = frames / (elapsed / 1000);
    track('perf', { fps: fps < 20 ? '<20' : fps < 40 ? '20-40' : fps < 55 ? '40-55' : '55+' });
  };
  requestAnimationFrame(countFrame);
}
