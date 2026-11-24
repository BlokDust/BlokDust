// The plugins have GALLERY from their server, which answers only their origin (CHG-0039), run by
// tests/e2e/gallery.ts.
import { check, base, browser, type Device, P, GALLERY, press, tab, idle } from './harness.ts';

export async function pluginGallery(): Promise<void> {
  // ---- CHG-0039 (owner, 2026-11-19): the plugins have GALLERY, from their server; a patch opened there goes to the
  // processor (the DAW project keeps it). The server answers the plugins' origin only, never with credentials. ----
  {
    const pctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await pctx.addInitScript(
      ([site]) => {
        const listeners: Record<string, ((x: unknown) => void)[]> = {},
          sent: { id: string; v: any }[] = [];
        (window as any).__sent = sent;
        (window as any).__bd_pluginSite = site;
        (window as any).__JUCE__ = {
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
    plug.page.on('pageerror', (e) => {
      console.error(`  page error: ${e.message}`);
    });
    await plug.page.goto(`${base}/index.html`);
    await plug.page.waitForFunction(() => (window as any).__bd_probe?.state.started, null, {
      timeout: 20000,
    });
    await plug.page.waitForTimeout(1200);
    await tab(plug, GALLERY);
    await idle(plug);
    await press(plug, 'sort_examples', 300);
    await idle(plug);
    const listed = (await P(plug)).items.map((item: { title: string }) => item.title);
    await press(plug, 'gopen0', 600);
    if (
      (await plug.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.View)) ===
      'confirm'
    )
      await press(plug, 'openAnyway', 600);
    await plug.page
      .waitForFunction(
        () => ((window as any).__sent as { id: string }[]).some((e) => e.id === 'bd_patchApply'),
        null,
        { timeout: 15000 },
      )
      .catch(() => {});
    const applied = await plug.page.evaluate(() => {
      const e = ((window as any).__sent as { id: string; v: any }[]).find(
        (x) => x.id === 'bd_patchApply',
      );
      return e ? { mode: e.v.mode, blocks: JSON.parse(e.v.patch).blocks.length } : null;
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
    const h = (response: Response) => ({
      status: response.status,
      acao: response.headers.get('access-control-allow-origin'),
      creds: response.headers.get('access-control-allow-credentials'),
      headers: response.headers.get('access-control-allow-headers'),
    });
    check(
      "CHG-0039: the API allows the plugins' origins (juce://, https://juce.backend), with a key header, never credentials; no other origin",
      pre.status === 204 &&
        h(pre).acao === 'juce://juce.backend' &&
        (h(pre).headers ?? '').includes('authorization') &&
        !h(pre).creds &&
        h(get).acao === 'juce://juce.backend' &&
        !h(get).creds &&
        h(win).acao === 'https://juce.backend' &&
        !h(evil).acao &&
        !h(evilPre).acao,
      { pre: h(pre), get: h(get), win: h(win), evil: h(evil), evilPre: h(evilPre) },
    );
  }
}
