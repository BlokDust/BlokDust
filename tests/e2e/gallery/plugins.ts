// The plugins have GALLERY from their server, which answers only their origin (CHG-0039), run by
// tests/e2e/gallery.ts.
import {
  check,
  base,
  browser,
  type Device,
  panelState,
  GALLERY,
  press,
  tab,
  idle,
} from './harness.ts';
import type { SentMessage } from '../pageGlobals.ts';
import type { Patch } from '../../../web/src/patch/loadPatch.ts';

export async function pluginGallery(): Promise<void> {
  // ---- CHG-0039: the plugins have GALLERY from their server; a patch opened there goes to the
  // processor (the DAW keeps it). The server answers their origin only, never with credentials ----
  {
    const pctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await pctx.addInitScript(
      ([site]) => {
        const listeners: Partial<Record<string, ((payload: unknown) => void)[]>> = {},
          sent: SentMessage[] = [];
        window.__sent = sent;
        window.__bd_pluginSite = site;
        window.__JUCE__ = {
          backend: {
            addEventListener: (id: string, listener: (payload: unknown) => void) => {
              (listeners[id] ??= []).push(listener);
            },
            emitEvent: (id: string, payload: unknown) => {
              sent.push({ id, v: payload });
              if (id === 'bd_hello')
                setTimeout(() => {
                  listeners.bd_patch?.forEach((listener) => {
                    listener({
                      patch: JSON.stringify({
                        format: 'blokdust.patch',
                        version: 2,
                        seed: 1,
                        blocks: [],
                      }),
                      ids: {},
                    });
                  });
                }, 50);
            },
          },
        };
      },
      [`${base}/`] as const,
    );
    const plug: Device = { ctx: pctx, page: await pctx.newPage() };
    plug.page.on('pageerror', (error) => {
      console.error(`  page error: ${error.message}`);
    });
    await plug.page.goto(`${base}/index.html`);
    await plug.page.waitForFunction(
      () => '__bd_probe' in window && window.__bd_probe.state.started,
      null,
      {
        timeout: 20000,
      },
    );
    await plug.page.waitForTimeout(1200);
    await tab(plug, GALLERY);
    await idle(plug);
    await press(plug, 'sort_examples', 300);
    await idle(plug);
    const listed = (await panelState(plug)).items.map((item) => item.title);
    await press(plug, 'gopen0', 600);
    if ((await plug.page.evaluate(() => window.__bd_probe.scene.PatchesPanel.View)) === 'confirm')
      await press(plug, 'openAnyway', 600);
    await plug.page
      .waitForFunction(
        () => (window.__sent ?? []).some((message) => message.id === 'bd_patchApply'),
        null,
        { timeout: 15000 },
      )
      .catch(() => {});
    const applied = await plug.page.evaluate(() => {
      const message = (window.__sent ?? []).find((each) => each.id === 'bd_patchApply');
      if (!message) return null;
      const apply = message.v as { mode: string; patch: string };
      return { mode: apply.mode, blocks: (JSON.parse(apply.patch) as Patch).blocks.length };
    });
    check(
      'CHG-0039: the plugins have GALLERY (from their server); OPEN hands the patch to the processor',
      listed.length > 0 && applied?.mode === 'open' && applied.blocks > 0,
      { listed, applied },
    );
    await pctx.close();
    const pre = await fetch(`${base}/api/gallery?sort=new`, {
      method: 'OPTIONS',
      headers: {
        origin: 'juce://juce.backend',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'authorization',
      },
    });
    const get = await fetch(`${base}/api/gallery?sort=new`, {
      headers: { origin: 'juce://juce.backend' },
    });
    const win = await fetch(`${base}/api/gallery?sort=new`, {
      headers: { origin: 'https://juce.backend' },
    });
    const evil = await fetch(`${base}/api/gallery?sort=new`, {
      headers: { origin: 'https://evil.example' },
    });
    const evilPre = await fetch(`${base}/api/me`, {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example', 'access-control-request-method': 'DELETE' },
    });
    const corsOf = (response: Response) => ({
      status: response.status,
      acao: response.headers.get('access-control-allow-origin'),
      creds: response.headers.get('access-control-allow-credentials'),
      headers: response.headers.get('access-control-allow-headers'),
    });
    check(
      "CHG-0039: the API allows the plugins' origins (juce://, https://juce.backend), with a key header, never credentials; no other origin",
      pre.status === 204 &&
        corsOf(pre).acao === 'juce://juce.backend' &&
        (corsOf(pre).headers ?? '').includes('authorization') &&
        !corsOf(pre).creds &&
        corsOf(get).acao === 'juce://juce.backend' &&
        !corsOf(get).creds &&
        corsOf(win).acao === 'https://juce.backend' &&
        !corsOf(evil).acao &&
        !corsOf(evilPre).acao,
      {
        pre: corsOf(pre),
        get: corsOf(get),
        win: corsOf(win),
        evil: corsOf(evil),
        evilPre: corsOf(evilPre),
      },
    );
  }
}
