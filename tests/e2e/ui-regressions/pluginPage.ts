// The plugin page (VST3/AU editor) opened against a fake JUCE backend.
import { type Page } from 'playwright';
import { browser, url } from './harness.ts';

type Listener = (value: unknown) => void;

/** The plugin page with a fake JUCE backend: the processor sends `patch`; what the page sends is
 * recorded in window.__sent. */
export async function openPlugin(
  patch: unknown,
  errors: string[],
  ids?: Record<string, number>,
  standalone = false,
  extra: Record<string, unknown> = {},
): Promise<{ pg: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  await context.addInitScript(
    ([processorPatch, blockIds, isStandalone, extraFields]) => {
      const listeners: Partial<Record<string, Listener[]>> = {};
      const sent: { id: string; v: unknown }[] = [];
      window.__sent = sent;
      window.__fire = (id: string, value: unknown) => {
        listeners[id]?.forEach((listener) => {
          listener(value);
        });
      };
      window.__JUCE__ = {
        backend: {
          addEventListener: (id: string, listener: Listener) => {
            (listeners[id] ??= []).push(listener);
          },
          emitEvent: (id: string, value: unknown) => {
            sent.push({ id, v: value });
            if (id === 'bd_hello')
              setTimeout(() => {
                listeners.bd_patch?.forEach((listener) => {
                  listener({
                    patch: JSON.stringify(processorPatch),
                    ...(blockIds ? { ids: blockIds } : {}),
                    ...(isStandalone ? { standalone: isStandalone } : {}),
                    ...extraFields,
                  });
                });
              }, 50);
          },
        },
      };
    },
    [patch, ids, standalone, extra] as const,
  );
  const pg = await context.newPage();
  pg.on('pageerror', (error) => errors.push(error.message));
  await pg.goto(`${url}/index.html`);
  await pg.waitForFunction(() => (window as Partial<Window>).__bd_probe?.state.started, null, {
    timeout: 15000,
  });
  await pg.waitForTimeout(1500);
  return { pg, close: () => context.close() };
}
export const plugPatch = (
  blocks: { id: string; type: string; x: number; y: number; params?: Record<string, unknown> }[],
) => ({
  format: 'blokdust.patch',
  version: 2,
  seed: 1,
  blocks: blocks.map((b) => ({ params: {}, ...b })),
});
