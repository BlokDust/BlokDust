// The plugin page (VST3/AU editor) opened against a fake JUCE backend.
import { type Page } from 'playwright';
import { browser, url } from './harness.ts';

/** The plugin page with a fake JUCE backend: the processor sends `patch`; what the page sends is recorded (__sent). */
export async function openPlugin(
  patch: unknown,
  errors: string[],
  ids?: Record<string, number>,
  standalone = false,
  extra: Record<string, unknown> = {},
): Promise<{ pg: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  await ctx.addInitScript(
    ([p, ids, standalone, extra]) => {
      const listeners: Record<string, ((x: unknown) => void)[]> = {};
      const sent: { id: string; v: any }[] = [];
      window.__sent = sent;
      window.__fire = (id: string, value: unknown) => {
        listeners[id]?.forEach((listener) => {
          listener(value);
        });
      };
      window.__JUCE__ = {
        backend: {
          addEventListener: (id: string, fn: (x: unknown) => void) => {
            (listeners[id] ??= []).push(fn);
          },
          emitEvent: (id: string, v: unknown) => {
            sent.push({ id, v });
            if (id === 'bd_hello')
              setTimeout(() => {
                listeners.bd_patch?.forEach((f) => {
                  f({
                    patch: JSON.stringify(p),
                    ...(ids ? { ids } : {}),
                    ...(standalone ? { standalone } : {}),
                    ...extra,
                  });
                });
              }, 50);
          },
        },
      };
    },
    [patch, ids, standalone, extra] as const,
  );
  const pg = await ctx.newPage();
  pg.on('pageerror', (error) => errors.push(error.message));
  await pg.goto(`${url}/index.html`);
  await pg.waitForFunction(() => window.__bd_probe?.state.started, null, {
    timeout: 15000,
  });
  await pg.waitForTimeout(1500);
  return { pg, close: () => ctx.close() };
}
export const plugPatch = (
  blocks: { id: string; type: string; x: number; y: number; params?: Record<string, unknown> }[],
) => ({
  format: 'blokdust.patch',
  version: 2,
  seed: 1,
  blocks: blocks.map((b) => ({ params: {}, ...b })),
});
