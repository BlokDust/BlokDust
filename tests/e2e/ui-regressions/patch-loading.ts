// ui-regressions: Loading patches: missing files, unknown params and other people's patches.
import { OUT, browser, maxOver, open, type RegressionTest, url } from './harness.ts';
import { openList, patchesClick } from './patchesPanel.ts';
import { chromium } from 'playwright';

export const patchLoadingTests: Record<string, RegressionTest> = {
  /** Owner (2026-11-08): a missing file (a patch from another machine) can be relinked by dropping a file on the block
   * or with a button that opens the file picker. While the sample is missing, v1's LOAD NEW SAMPLE reads LOCATE FILE
   * and opens the picker (the plugin's native one, or the browser's) instead of the sample search. */
  async 'locate-missing-file'(errors: string[]) {
    const page = await open(browser, [], errors);
    await openList(page);
    const chooser = page.waitForEvent('filechooser');
    await patchesClick(page, 'file', 0);
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
    await page.waitForTimeout(600);
    await patchesClick(page, 'fileOpen', 1200);
    await page.evaluate(() => {
      const seen: string[] = (window.__texts = []);
      const drawText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text: string, ...a: any[]) {
        seen.push(text);
        return (drawText as any).call(this, text, ...a);
      };
      const host = window.__bd_probe.scene.host;
      window.__picked = [];
      host.loadSample = (id: number) => window.__picked.push(id);
    });
    await page.mouse.click(640, 402);
    await page.waitForTimeout(1000); // the block: its options panel
    await page.mouse.move(941, 443);
    await page.mouse.click(941, 443);
    await page.waitForTimeout(800); // v1's LOAD NEW SAMPLE button
    const result = await page.evaluate(() => ({
      texts: window.__texts
        .filter((__text: string) => /LOCATE|LOAD NEW|MISSING/.test(__text))
        .slice(0, 4),
      picked: window.__picked,
      search: window.__bd_probe.scene.SoundcloudPanel.Open,
    }));
    await page.screenshot({ path: `${OUT}/locate-missing-file.png` });
    await page.close();
    return [
      result.texts.includes('LOCATE FILE') &&
        !result.texts.includes('LOAD NEW SAMPLE') &&
        result.picked.length === 1 &&
        !result.search,
      result,
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
      loaded.commands.some((command) => command.type === 3 && command.value === 7);
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
      const page = await ctx.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(() => {
        const texts: string[] = (window.__texts = []),
          drawText = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function (x: string, ...a: any[]) {
          texts.push(x);
          return (drawText as any).call(this, x, ...a);
        };
      });
      await page.goto(`${url}/index.html?c=${code}`);
      await page.waitForFunction(() => window.__bd_probe);
      await page.click('#start');
      await page.waitForFunction(() => window.__bd_probe.state.started, null, {
        timeout: 20000,
      });
      await page.waitForTimeout(2000);
      const types = await page.evaluate(() =>
        (window.__bd_probe.state.patch.blocks as { type: string }[]).map((x) => x.type),
      );
      const before = await page.evaluate(() => ({
        mic: window.__bd_probe.microphoneOpen,
        guarded: window.__bd_probe.guarded,
        asked: (window.__texts as string[]).some((text) =>
          /THIS PATCH USES YOUR MICROPHONE/i.test(text),
        ),
      }));
      await page.screenshot({ path: `${OUT}/others-patch-mic.png` });
      await page.evaluate(() => window.__bd_probe.scene.MessagePanel._Value.buttonEvent()); // TURN ON
      await page
        .waitForFunction(() => window.__bd_probe.microphoneOpen, null, { timeout: 10000 })
        .catch(() => {});
      await page.waitForTimeout(800);
      const on = await page.evaluate(() => window.__bd_probe.microphoneOpen);
      const unpowered = await maxOver(page, 'rms', 1500);
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
