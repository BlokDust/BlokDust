// ui-regressions: waveform zoom in the options panel (CHG-0028; web/src/v1ui/waveZoom.ts).
import { OUT, blk, blockAt, browser, comp, toCss, type RegressionTest, url } from './harness.ts';
import { openPlugin, plugPatch } from './pluginPage.ts';
import { burstWav, decayWav } from './wav.ts';
import type { V1BlockView } from './v1Views.ts';

/** What the open panel's waveregion row shows: its window on the sound and the burst's place. */
interface RowLook {
  x: number;
  y: number;
  w: number;
  min: number;
  max: number;
  drawn: number;
  scale: number;
  filled: number;
}

export const waveformTests: Record<string, RegressionTest> = {
  // A sample's waveform zooms and slides (wheel, pinch, swipe, drag, two fingers) so a tiny loop of
  // a long sample can be picked; the stage never zooms.
  async 'waveform-zoom'(errors: string[]) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('https://cdn.freesound.org/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'audio/wav',
        headers: { 'access-control-allow-origin': '*' },
        body: decayWav(3),
      }),
    );
    await page.goto(`${url}/index.html?v1=${comp([blk(1, 'Sample', 0, 0)])}`);
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForFunction(() => window.__bd_probe.state.snapshots > 10);
    await page.waitForFunction(() => window.__bd_probe.samples.some((x) => x.loaded), null, {
      timeout: 10000,
    });
    await page.waitForTimeout(1200);
    const [bx, by] = await toCss(page, 0, 0.5);
    await page.mouse.click(bx, by);
    await page.waitForTimeout(1200);
    const geo = () =>
      page.evaluate(() => {
        const probe = window.__bd_probe,
          optionsPanel = probe.scene.OptionsPanel,
          region = optionsPanel.Options.find((x) => x.Type === 'waveregion'),
          selectedBlock = optionsPanel.SelectedBlock as V1BlockView;
        if (!region) throw new Error('no waveregion row');
        return {
          x: optionsPanel.Position.x + optionsPanel.Margin,
          w: optionsPanel.Range,
          y: optionsPanel.Position.y + region.Position.y,
          h: region.Size.height,
          min: region.Min,
          max: region.Max,
          span: region.Max - region.Min,
          wave: region.Waveform?.length ?? 0,
          start: selectedBlock.Params.startPosition as number,
          end: selectedBlock.Params.endPosition as number,
          loopStart: selectedBlock.Params.loopStart as number,
          dur: selectedBlock.GetDuration(),
          handle0: region.Handles[0].Position.x,
          stageZoom: probe.v1App.ZoomLevel,
          drag: { x: probe.v1App.DragOffset.x, y: probe.v1App.DragOffset.y },
        };
      });
    const result: Record<string, unknown> = {};
    const g0 = await geo();
    result.whole = { min: g0.min, max: g0.max, dur: g0.dur };
    const mid = g0.y + g0.h / 2;
    // 1. The mouse wheel at the waveform's left edge (the grab margin) zooms in about it.
    await page.mouse.move(g0.x - 4, mid);
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(40);
    }
    const g1 = await geo();
    result.wheel = { min: g1.min, span: g1.span, wave: g1.wave };
    // 2. trackpad pinch (Ctrl + wheel) zooms further
    await page.keyboard.down('Control');
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, -50);
      await page.waitForTimeout(40);
    }
    await page.keyboard.up('Control');
    const g2 = await geo();
    result.pinch = { min: g2.min, span: g2.span };
    // 3. The Start handle dragged half way across the window lands half way through it.
    await page.mouse.move(g2.x + g2.handle0, mid);
    await page.mouse.down();
    await page.mouse.move(g2.x + g2.w / 2, mid, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(100);
    const g3 = await geo();
    const handleWant = g2.min + g2.span / 2;
    result.handle = { start: g3.start, want: handleWant };
    // 4. a drag on the waveform away from the handles slides it on (left: later in the sound)
    await page.mouse.move(g3.x + g3.w * 0.9, mid);
    await page.mouse.down();
    await page.mouse.move(g3.x + g3.w * 0.7, mid, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(100);
    const g4 = await geo();
    result.dragPan = { min: g4.min, span: g4.span, start: g4.start };
    // 5. a sideways trackpad swipe slides it back
    await page.mouse.move(g4.x + g4.w * 0.5, mid);
    await page.mouse.wheel(-Math.round(g4.w * 0.1), 0);
    await page.waitForTimeout(100);
    const g5 = await geo();
    result.swipe = { min: g5.min, span: g5.span };
    await page.screenshot({ path: `${OUT}/waveform-zoom.png` });
    // 6. Two fingers spreading zoom about their midpoint; the first finger's press moves nothing.
    const cdp = await context.newCDPSession(page);
    const pt = (fraction: number, id: number) => ({ x: g5.x + g5.w * fraction, y: mid, id });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [pt(0.45, 1)],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [pt(0.45, 1), pt(0.55, 2)],
    });
    for (let i = 1; i <= 8; i++) {
      const spread = 0.05 + (0.15 * i) / 8;
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [pt(0.5 - spread, 1), pt(0.5 + spread, 2)],
      });
      await page.waitForTimeout(16);
    }
    const during = await page.evaluate(() => window.__bd_touch());
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [pt(0.7, 2)] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(200);
    const g6 = await geo();
    const touch = {
      min: g6.min,
      span: g6.span,
      start: g6.start,
      stagePinch: during.pinch,
      centre: g6.min + g6.span / 2,
      wasCentre: g5.min + g5.span / 2,
    };
    result.touch = touch;
    // 7. zoomed all the way out: the whole sound again, region kept
    await page.mouse.move(g6.x + g6.w / 2, mid);
    for (let i = 0; i < 80; i++) await page.mouse.wheel(0, 100);
    await page.waitForTimeout(100);
    const g7 = await geo();
    result.out = { min: g7.min, max: g7.max, start: g7.start };
    const stage = [g0, g1, g2, g3, g4, g5, g6, g7].map((look) => [
      look.stageZoom,
      look.drag.x,
      look.drag.y,
    ]);
    result.stage = stage;
    await context.close();
    const close = (a: number, b: number, eps: number) => Math.abs(a - b) <= eps;
    const pass =
      close(g0.min, 0, 1e-9) &&
      close(g0.max, g0.dur, 1e-9) &&
      g1.span < g0.dur * 0.5 &&
      close(g1.min, 0, 1e-9) &&
      g1.wave === 200 &&
      g2.span < g1.span * 0.6 &&
      close(g3.start, handleWant, g2.span * 0.03) &&
      close(g4.min, g3.min + g3.span * 0.2, g3.span * 0.02) &&
      close(g4.span, g3.span, 1e-9) &&
      close(g4.start, g3.start, 1e-9) &&
      close(g5.min, g4.min - g4.span * 0.1, g4.span * 0.02) &&
      g6.span < g5.span * 0.45 &&
      close(touch.centre, touch.wasCentre, g5.span * 0.03) &&
      close(g6.start, g5.start, 1e-9) &&
      !touch.stagePinch &&
      close(g7.min, 0, 1e-9) &&
      close(g7.max, g0.dur, 1e-9) &&
      close(g7.start, g3.start, 1e-9) &&
      stage.every((view) => JSON.stringify(view) === JSON.stringify(stage[0]));
    return [pass, result];
  },
  // Zoomed in, the waveform slid at another speed than the markers: the burst is drawn where the
  // row's own scale (which places the handles) puts its time, unzoomed, zoomed and panned.
  async 'waveform-zoom-lines-up'(errors: string[]) {
    const BURST = 1.2;
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('https://cdn.freesound.org/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'audio/wav',
        headers: { 'access-control-allow-origin': '*' },
        body: burstWav(3, BURST),
      }),
    );
    await page.goto(`${url}/index.html?v1=${comp([blk(1, 'Sample', 0, 0)])}`);
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForFunction(() => window.__bd_probe.samples.some((x) => x.loaded), null, {
      timeout: 10000,
    });
    await page.waitForTimeout(1200);
    const [bx, by] = await toCss(page, 0, 0.5);
    await page.mouse.click(bx, by);
    await page.waitForTimeout(1200);
    // Where the burst is drawn (the row's loudest point, 0..1 across) and where the scale puts it.
    const look = () =>
      page.evaluate((at): RowLook => {
        const optionsPanel = window.__bd_probe.scene.OptionsPanel,
          region = optionsPanel.Options.find((x) => x.Type === 'waveregion');
        if (!region) throw new Error('no waveregion row');
        const wave = region.Waveform;
        if (!wave) throw new Error('the waveregion row has no waveform');
        const peak = wave.indexOf(Math.max(...wave));
        return {
          x: optionsPanel.Position.x + optionsPanel.Margin,
          y: optionsPanel.Position.y + region.Position.y + region.Size.height / 2,
          w: optionsPanel.Range,
          min: region.Min,
          max: region.Max,
          drawn: (peak + 0.5) / wave.length,
          scale: (at - region.Min) / (region.Max - region.Min),
          filled: wave.filter((x) => x > 0.02).length / wave.length,
        };
      }, BURST);
    const whole = await look();
    await page.mouse.move(whole.x + whole.w * 0.2, whole.y);
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(40);
    }
    const zoomed = await look();
    await page.mouse.wheel(Math.round(zoomed.w * 0.15), 0);
    await page.waitForTimeout(150);
    const panned = await look();
    // All the way in, a notch at a time, about the burst: every step lines up and fills the row.
    const looks: RowLook[] = [];
    for (let i = 0; i < 44; i++) {
      const row = await look();
      await page.mouse.move(row.x + row.w * Math.min(0.95, Math.max(0.05, row.scale)), row.y);
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(40);
      looks.push(await look());
    }
    await context.close();
    // In the 3 ms burst, ± one drawn point.
    const lined = (row: RowLook) =>
      row.scale > 0.02 &&
      row.scale < 0.98 &&
      row.filled > 0.97 &&
      row.drawn > row.scale - 0.006 &&
      row.drawn < row.scale + 0.003 / (row.max - row.min) + 0.006;
    const steps = looks.map((row) => ({
      span: +(row.max - row.min).toFixed(4),
      off: +(row.drawn - row.scale).toFixed(3),
      filled: row.filled,
    }));
    const last = looks.at(-1);
    return [
      lined(whole) &&
        lined(zoomed) &&
        lined(panned) &&
        zoomed.max - zoomed.min < 1.5 &&
        looks.every(lined) &&
        !!last &&
        last.max - last.min < 0.02,
      { whole, zoomed, panned, steps },
    ];
  },
  // The same in the plugins, whose page has only the processor's 4000-point preview: the zoomed
  // waveform filled part of the row and snapped to whole points while the markers glided.
  async 'waveform-zoom-plugin-preview'(errors: string[]) {
    const { pg, close } = await openPlugin(
      plugPatch([{ id: 's', type: 'source.sample', x: 0, y: 0 }]),
      errors,
    );
    const id = await pg.evaluate(() => window.__bd_probe.state.blocks[0].id);
    let seed = 1;
    const noise = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return 0.15 + (0.1 * seed) / 2 ** 32;
    };
    // A burst at 40 %.
    const preview = Array.from({ length: 4000 }, (_, i) => (i >= 1599 && i < 1602 ? 1 : noise()));
    const BURST = (3 * 1600.5) / 4000;
    await pg.evaluate(
      ([i, pv]) => {
        window.__fire?.('bd_sampleInfo', {
          id: i,
          loading: false,
          missing: false,
          duration: 3,
          sampleRate: 44100,
          preview: pv,
          track: 'freesound:1',
        });
      },
      [id, preview] as const,
    );
    const [bx, by] = await blockAt(pg, id);
    await pg.mouse.click(bx, by);
    await pg.waitForTimeout(1200);
    const look = () =>
      pg.evaluate((at): RowLook => {
        const optionsPanel = window.__bd_probe.scene.OptionsPanel,
          region = optionsPanel.Options.find((x) => x.Type === 'waveregion');
        if (!region) throw new Error('no waveregion row');
        const wave = region.Waveform;
        if (!wave) throw new Error('the waveregion row has no waveform');
        const peak = wave.indexOf(Math.max(...wave));
        return {
          x: optionsPanel.Position.x + optionsPanel.Margin,
          y: optionsPanel.Position.y + region.Position.y + region.Size.height / 2,
          w: optionsPanel.Range,
          min: region.Min,
          max: region.Max,
          drawn: (peak + 0.5) / wave.length,
          scale: (at - region.Min) / (region.Max - region.Min),
          filled: wave.filter((x) => x > 0.02).length / wave.length,
        };
      }, BURST);
    const first = await look();
    const steps: RowLook[] = [first];
    // In a notch at a time, a little left of the burst (it moves across the row), as far as the
    // zoom goes; then a swipe.
    for (let i = 0; i < 22; i++) {
      const row = steps.at(-1) ?? first;
      await pg.mouse.move(row.x + row.w * Math.max(0.05, row.scale - 0.1), row.y);
      await pg.mouse.wheel(0, -100);
      await pg.waitForTimeout(40);
      steps.push(await look());
    }
    await pg.mouse.wheel(Math.round(first.w * 0.1), 0);
    await pg.waitForTimeout(150);
    steps.push(await look());
    await close();
    // The burst is 3 preview points wide (BURST is its middle): within half that, plus a point.
    const lined = (row: RowLook) =>
      row.scale > 0.02 &&
      row.scale < 0.98 &&
      Math.abs(row.drawn - row.scale) < (1.5 * 3) / 4000 / (row.max - row.min) + 0.006;
    const deepest = steps.at(-2);
    const ok =
      steps.every((row) => row.filled > 0.97) &&
      steps.every(lined) &&
      !!deepest &&
      deepest.max - deepest.min < 0.35;
    return [
      ok,
      steps.map((row) => ({
        span: +(row.max - row.min).toFixed(4),
        off: +(row.drawn - row.scale).toFixed(3),
        filled: +row.filled.toFixed(3),
      })),
    ];
  },
};
