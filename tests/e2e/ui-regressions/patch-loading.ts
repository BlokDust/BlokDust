// ui-regressions: Loading patches: missing files, unknown params and other people's patches.
import { OUT, browser, maxOver, open, type RegressionTest, url } from './harness.ts';
import { openList, patchesClick } from './patchesPanel.ts';
import { chromium } from 'playwright';
import type { MessagePanelText } from './v1Views.ts';

export const patchLoadingTests: Record<string, RegressionTest> = {
  /** A missing file (a patch from another machine) is relinked by a drop or the file picker: v1's
   * LOAD NEW SAMPLE reads LOCATE FILE and opens the picker instead of the sample search. */
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
      const proto = CanvasRenderingContext2D.prototype,
        drawText = Object.getOwnPropertyDescriptor(proto, 'fillText')
          ?.value as typeof proto.fillText;
      proto.fillText = function (text: string, ...rest: [number, number, number?]) {
        seen.push(text);
        drawText.call(this, text, ...rest);
      };
      const host = window.__bd_probe.scene.host;
      const picked: number[] = (window.__picked = []);
      host.loadSample = (id: number) => {
        picked.push(id);
      };
    });
    await page.mouse.click(640, 402);
    await page.waitForTimeout(1000); // the block: its options panel
    await page.mouse.move(941, 443);
    await page.mouse.click(941, 443);
    await page.waitForTimeout(800); // v1's LOAD NEW SAMPLE button
    const result = await page.evaluate(() => ({
      texts: (window.__texts ?? [])
        .filter((text) => /LOCATE|LOAD NEW|MISSING/.test(text))
        .slice(0, 4),
      picked: window.__picked ?? [],
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
  /** The page's loader (a Stage's inner world) drops an unknown param with a warning, as the
   * engine's does, instead of refusing a patch saved by a newer BlokDust. */
  async 'load-unknown-param'() {
    const { loadPatch } = await import('../../../web/src/patch/loadPatch.ts');
    let loaded: ReturnType<typeof loadPatch> | null = null,
      error = '';
    try {
      loaded = loadPatch({
        blocks: [
          { id: 't', type: 'source.tone', x: 0, y: 0, params: { fromTheFuture: 3, transpose: 7 } },
          { id: 'p', type: 'power.power', x: -3, y: 0 },
        ],
      });
    } catch (caught) {
      error = (caught as Error).message;
    }
    const ok =
      !!loaded &&
      loaded.ids.size === 2 &&
      loaded.warnings.length === 1 &&
      (loaded.warnings[0] ?? '').includes('fromTheFuture') &&
      loaded.commands.some((command) => command.type === 3 && command.value === 7);
    return [ok, { error, ids: loaded?.ids.size, warnings: loaded?.warnings }];
  },
  /** Web: Audio In is a powered Microphone; someone else's patch starts with it off (the bar asks,
   * TURN ON opens it) and its sound goes through the safety limit. */
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
    const micBrowser = await chromium.launch({
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
    });
    try {
      const context = await micBrowser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(() => {
        const texts: string[] = (window.__texts = []),
          proto = CanvasRenderingContext2D.prototype,
          drawText = Object.getOwnPropertyDescriptor(proto, 'fillText')
            ?.value as typeof proto.fillText;
        proto.fillText = function (text: string, ...rest: [number, number, number?]) {
          texts.push(text);
          drawText.call(this, text, ...rest);
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
        window.__bd_probe.state.patch.blocks.map((x) => x.type),
      );
      const before = await page.evaluate(() => ({
        mic: window.__bd_probe.microphoneOpen,
        guarded: window.__bd_probe.guarded,
        asked: (window.__texts ?? []).some((text) => /THIS PATCH USES YOUR MICROPHONE/i.test(text)),
      }));
      await page.screenshot({ path: `${OUT}/others-patch-mic.png` });
      // TURN ON
      await page.evaluate(() => {
        (
          window.__bd_probe.scene.MessagePanel as unknown as MessagePanelText
        )._Value?.buttonEvent?.();
      });
      await page
        .waitForFunction(() => window.__bd_probe.microphoneOpen, null, { timeout: 10000 })
        .catch(() => {});
      await page.waitForTimeout(800);
      const on = await page.evaluate(() => window.__bd_probe.microphoneOpen);
      const unpowered = await maxOver(page, 'rms', 1500);
      await context.close();
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
      await micBrowser.close();
    }
  },
};
