// ui-regressions: Loading patches: missing files, unknown params and other people's patches.
import { OUT, browser, maxOver, open, type RegressionTest, url } from './harness.ts';
import { openList, patchesClick } from './patchesPanel.ts';
import { chromium } from 'playwright';

export const patchLoadingTests: Record<string, RegressionTest> = {
  /** Owner (2026-11-08): a missing file (a patch from another machine) can be relinked by dropping a file on the block
   * or with a button that opens the file picker. While the sample is missing, v1's LOAD NEW SAMPLE reads LOCATE FILE
   * and opens the picker (the plugin's native one, or the browser's) instead of the sample search. */
  async 'locate-missing-file'(errors: string[]) {
    const p = await open(browser, [], errors);
    await openList(p);
    const chooser = p.waitForEvent('filechooser');
    await patchesClick(p, 'file', 0);
    await (
      await chooser
    ).setFiles({
      name: 'beat.blokdust',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          format: 'blokdust.patch',
          version: 2,
          blocks: [
            {
              id: 's',
              type: 'source.sample',
              x: 0,
              y: 0,
              params: { track: 'file:kick.wav', trackName: 'KICK' },
            },
          ],
          refs: {
            'file:kick.wav': {
              provider: 'file',
              name: 'kick.wav',
              bytes: 1000,
              durationSec: 1,
              hash: 'sha256:none',
            },
          },
        }),
      ),
    });
    await p.waitForTimeout(600);
    await patchesClick(p, 'fileOpen', 1200);
    await p.evaluate(() => {
      const seen: string[] = ((window as any).__texts = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) {
        seen.push(t);
        return (f as any).call(this, t, ...a);
      };
      const host = (window as any).__bd_probe.scene.host;
      (window as any).__picked = [];
      host.loadSample = (id: number) => (window as any).__picked.push(id);
    });
    await p.mouse.click(640, 402);
    await p.waitForTimeout(1000); // the block: its options panel
    await p.mouse.move(941, 443);
    await p.mouse.click(941, 443);
    await p.waitForTimeout(800); // v1's LOAD NEW SAMPLE button
    const r = await p.evaluate(() => ({
      texts: (window as any).__texts
        .filter((__text: string) => /LOCATE|LOAD NEW|MISSING/.test(__text))
        .slice(0, 4),
      picked: (window as any).__picked,
      search: (window as any).__bd_probe.scene.SoundcloudPanel.Open,
    }));
    await p.screenshot({ path: `${OUT}/locate-missing-file.png` });
    await p.close();
    return [
      r.texts.includes('LOCATE FILE') &&
        !r.texts.includes('LOAD NEW SAMPLE') &&
        r.picked.length === 1 &&
        !r.search,
      r,
    ];
  },
  /** The page's loader (a Stage's inner world on the website) drops an unknown param with a warning instead of
   * refusing the patch, as the engine's does (a patch saved by a newer BlokDust). */
  async 'load-unknown-param'() {
    const { loadPatch } = await import('../../../web/src/patch/loadPatch.ts');
    let loaded: any = null,
      error = '';
    try {
      loaded = loadPatch({
        blocks: [
          { id: 't', type: 'source.tone', x: 0, y: 0, params: { fromTheFuture: 3, transpose: 7 } },
          { id: 'p', type: 'power.power', x: -3, y: 0 },
        ],
      });
    } catch (e) {
      error = (e as Error).message;
    }
    const ok =
      !!loaded &&
      loaded.ids.size === 2 &&
      loaded.warnings?.length === 1 &&
      /fromTheFuture/.test(loaded.warnings[0]) &&
      loaded.commands.some((command: any) => command.type === 3 && command.value === 7);
    return [ok, { error, ids: loaded?.ids.size, warnings: loaded?.warnings }];
  },
  /** On the website a patch's Audio In is a Microphone (it needs power). Someone else's patch (here a link) starts
   * with the microphone off: the message bar asks, TURN ON opens it; its sound goes through the safety limit. */
  async 'others-patch-mic-off-and-limited'(errors: string[]) {
    const { encodePatch } = await import('../../../web/src/patch/share.ts');
    const code = await encodePatch({
      format: 'blokdust.patch',
      version: 2,
      seed: 1,
      blocks: [
        { id: 'in', type: 'source.audio-in', x: 0, y: 0, params: {} },
        { id: 'b2', type: 'fx.bit-crusher', x: -2, y: -3, params: {} },
      ],
    });
    const b = await chromium.launch({
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
    });
    try {
      const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
      const p = await ctx.newPage();
      p.on('pageerror', (e) => errors.push(e.message));
      await p.addInitScript(() => {
        const t: string[] = ((window as any).__texts = []),
          f = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function (x: string, ...a: any[]) {
          t.push(x);
          return (f as any).call(this, x, ...a);
        };
      });
      await p.goto(`${url}/index.html?c=${code}`);
      await p.waitForFunction(() => (window as any).__bd_probe);
      await p.click('#start');
      await p.waitForFunction(() => (window as any).__bd_probe.state.started, null, {
        timeout: 20000,
      });
      await p.waitForTimeout(2000);
      const types = await p.evaluate(() =>
        ((window as any).__bd_probe.state.patch.blocks as { type: string }[]).map((x) => x.type),
      );
      const before = await p.evaluate(() => ({
        mic: (window as any).__bd_probe.microphoneOpen,
        guarded: (window as any).__bd_probe.guarded,
        asked: ((window as any).__texts as string[]).some((t) =>
          /THIS PATCH USES YOUR MICROPHONE/i.test(t),
        ),
      }));
      await p.screenshot({ path: `${OUT}/others-patch-mic.png` });
      await p.evaluate(() => (window as any).__bd_probe.scene.MessagePanel._Value.buttonEvent()); // TURN ON
      await p
        .waitForFunction(() => (window as any).__bd_probe.microphoneOpen, null, { timeout: 10000 })
        .catch(() => {});
      await p.waitForTimeout(800);
      const on = await p.evaluate(() => (window as any).__bd_probe.microphoneOpen);
      const unpowered = await maxOver(p, 'rms', 1500);
      await ctx.close();
      const ok =
        types.includes('source.microphone') &&
        !types.includes('source.audio-in') &&
        !before.mic &&
        before.guarded.page &&
        before.guarded.limit &&
        before.asked &&
        on &&
        unpowered < 1e-4;
      return [ok, { types, before, on, unpowered }];
    } finally {
      await b.close();
    }
  },
};
