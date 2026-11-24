// Waveform zoom in the options panel (CHG-0028; web/src/v1ui/waveZoom.ts): ui-regressions' tests for it, one file per area.
import type { Browser, Page } from 'playwright';

type Block = { Id: number; Type: string; Position: { x: number; y: number } };
export interface Harness {
  browser: Browser;
  url: string;
  OUT: string;
  comp: (blocks: Block[]) => string;
  blk: (Id: number, Type: string, x: number, y: number) => Block;
  toCss: (p: Page, x: number, y: number) => Promise<[number, number]>;
  decayWav: (seconds: number) => Buffer;
  openPlugin: (
    patch: unknown,
    errors: string[],
  ) => Promise<{ pg: Page; close: () => Promise<void> }>;
  plugPatch: (blocks: { id: string; type: string; x: number; y: number }[]) => unknown;
}

/** `seconds` of quiet noise (±0.2, a fixed LCG) with one loud 3 ms burst of a 2205 Hz sine at `at` seconds, as
 * 16-bit mono 44.1 kHz WAV bytes. The noise shows whether a waveform fills its row; the burst where it is drawn. */
const burstWav = (seconds: number, at: number) => {
  let seed = 1;
  const noise = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 2 ** 32 - 0.5) * 0.4;
  };
  const n = Math.round(44100 * seconds),
    b = Buffer.alloc(44 + n * 2),
    from = Math.round(at * 44100),
    to = from + 132;
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + n * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(44100, 24);
  b.writeUInt32LE(88200, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++)
    b.writeInt16LE(
      Math.round(
        (i >= from && i < to ? Math.sin((2 * Math.PI * 2205 * i) / 44100) * 0.92 : noise()) * 32767,
      ),
      44 + i * 2,
    );
  return b;
};

export function waveformTests({
  browser,
  url,
  OUT,
  comp,
  blk,
  toCss,
  decayWav,
  openPlugin,
  plugPatch,
}: Harness): Record<string, (errors: string[]) => Promise<[boolean, unknown]>> {
  return {
    // Owner (2026-11-15): a sample's waveform zooms and slides, so a tiny loop of a long sample can be picked: mouse wheel,
    // trackpad pinch (Ctrl + wheel) and sideways swipe, a drag on the waveform, two fingers. The stage never zooms.
    async 'waveform-zoom'(errors: string[]) {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        hasTouch: true,
      });
      const p = await ctx.newPage();
      p.on('pageerror', (e) => errors.push(e.message));
      await p.route('https://cdn.freesound.org/**', (r) =>
        r.fulfill({
          status: 200,
          contentType: 'audio/wav',
          headers: { 'access-control-allow-origin': '*' },
          body: decayWav(3),
        }),
      );
      await p.goto(`${url}/index.html?v1=${comp([blk(1, 'Sample', 0, 0)])}`);
      await p.waitForFunction(() => (window as any).__bd_probe);
      await p.click('#start');
      await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
      await p.waitForFunction(
        () => (window as any).__bd_probe.samples.some((x: any) => x.loaded),
        null,
        { timeout: 10000 },
      );
      await p.waitForTimeout(1200);
      const [bx, by] = await toCss(p, 0, 0.5);
      await p.mouse.click(bx, by);
      await p.waitForTimeout(1200);
      const geo = () =>
        p.evaluate(() => {
          const P = (window as any).__bd_probe,
            o = P.scene.OptionsPanel,
            w = (o.Options as any[]).find((x) => x.Type === 'waveregion'),
            v = o.SelectedBlock;
          return {
            x: o.Position.x + o.Margin,
            w: o.Range,
            y: o.Position.y + w.Position.y,
            h: w.Size.height,
            min: w.Min,
            max: w.Max,
            span: w.Max - w.Min,
            wave: (w.Waveform as number[]).length,
            start: v.Params.startPosition,
            end: v.Params.endPosition,
            loopStart: v.Params.loopStart,
            dur: v.GetDuration(),
            handle0: w.Handles[0].Position.x,
            stageZoom: P.v1App.ZoomLevel,
            drag: { ...P.v1App.DragOffset },
          };
        });
      const r: Record<string, any> = {};
      const g0 = await geo();
      r.whole = { min: g0.min, max: g0.max, dur: g0.dur };
      const mid = g0.y + g0.h / 2;
      // 1. mouse wheel at the waveform's left edge: zooms in about the pointer
      await p.mouse.move(g0.x - 4, mid); // in the grab margin: the left edge stays put
      for (let i = 0; i < 8; i++) {
        await p.mouse.wheel(0, -100);
        await p.waitForTimeout(40);
      }
      const g1 = await geo();
      r.wheel = { min: g1.min, span: g1.span, wave: g1.wave };
      // 2. trackpad pinch (Ctrl + wheel) zooms further
      await p.keyboard.down('Control');
      for (let i = 0; i < 3; i++) {
        await p.mouse.wheel(0, -50);
        await p.waitForTimeout(40);
      }
      await p.keyboard.up('Control');
      const g2 = await geo();
      r.pinch = { min: g2.min, span: g2.span };
      // 3. the Start handle dragged half way across the window lands half way through it (fine control)
      await p.mouse.move(g2.x + g2.handle0, mid);
      await p.mouse.down();
      await p.mouse.move(g2.x + g2.w / 2, mid, { steps: 6 });
      await p.mouse.up();
      await p.waitForTimeout(100);
      const g3 = await geo();
      r.handle = { start: g3.start, want: g2.min + g2.span / 2 };
      // 4. a drag on the waveform away from the handles slides it on (left: later in the sound)
      await p.mouse.move(g3.x + g3.w * 0.9, mid);
      await p.mouse.down();
      await p.mouse.move(g3.x + g3.w * 0.7, mid, { steps: 6 });
      await p.mouse.up();
      await p.waitForTimeout(100);
      const g4 = await geo();
      r.dragPan = { min: g4.min, span: g4.span, start: g4.start };
      // 5. a sideways trackpad swipe slides it back
      await p.mouse.move(g4.x + g4.w * 0.5, mid);
      await p.mouse.wheel(-Math.round(g4.w * 0.1), 0);
      await p.waitForTimeout(100);
      const g5 = await geo();
      r.swipe = { min: g5.min, span: g5.span };
      await p.screenshot({ path: `${OUT}/waveform-zoom.png` });
      // 6. two fingers spreading on the waveform zoom it about their midpoint; the first finger's press moves nothing
      const cdp = await ctx.newCDPSession(p);
      const pt = (f: number, id: number) => ({ x: g5.x + g5.w * f, y: mid, id });
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [pt(0.45, 1)],
      });
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [pt(0.45, 1), pt(0.55, 2)],
      });
      for (let i = 1; i <= 8; i++) {
        const d = 0.05 + (0.15 * i) / 8;
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [pt(0.5 - d, 1), pt(0.5 + d, 2)],
        });
        await p.waitForTimeout(16);
      }
      const during = await p.evaluate(() => (window as any).__bd_touch());
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [pt(0.7, 2)] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await p.waitForTimeout(200);
      const g6 = await geo();
      r.touch = {
        min: g6.min,
        span: g6.span,
        start: g6.start,
        stagePinch: during.pinch,
        centre: g6.min + g6.span / 2,
        wasCentre: g5.min + g5.span / 2,
      };
      // 7. zoomed all the way out: the whole sound again, region kept
      await p.mouse.move(g6.x + g6.w / 2, mid);
      for (let i = 0; i < 80; i++) await p.mouse.wheel(0, 100);
      await p.waitForTimeout(100);
      const g7 = await geo();
      r.out = { min: g7.min, max: g7.max, start: g7.start };
      r.stage = [g0, g1, g2, g3, g4, g5, g6, g7].map((g) => [g.stageZoom, g.drag.x, g.drag.y]);
      await ctx.close();
      const close = (a: number, b: number, eps: number) => Math.abs(a - b) <= eps;
      const pass =
        close(g0.min, 0, 1e-9) &&
        close(g0.max, g0.dur, 1e-9) &&
        g1.span < g0.dur * 0.5 &&
        close(g1.min, 0, 1e-9) &&
        g1.wave === 200 &&
        g2.span < g1.span * 0.6 &&
        close(g3.start, r.handle.want, g2.span * 0.03) &&
        close(g4.min, g3.min + g3.span * 0.2, g3.span * 0.02) &&
        close(g4.span, g3.span, 1e-9) &&
        close(g4.start, g3.start, 1e-9) &&
        close(g5.min, g4.min - g4.span * 0.1, g4.span * 0.02) &&
        g6.span < g5.span * 0.45 &&
        close(r.touch.centre, r.touch.wasCentre, g5.span * 0.03) &&
        close(g6.start, g5.start, 1e-9) &&
        !r.touch.stagePinch &&
        close(g7.min, 0, 1e-9) &&
        close(g7.max, g0.dur, 1e-9) &&
        close(g7.start, g3.start, 1e-9) &&
        r.stage.every((s: number[]) => JSON.stringify(s) === JSON.stringify(r.stage[0]));
      return [pass, r];
    },
    // Owner (2026-11-20, screen recording): zoomed in, the waveform slid at a different speed from the Start/End
    // markers, so a marker didn't stay on its point in the sound. The sound's burst must be drawn where the row's own
    // scale (its min/max, which places the handles) puts its time: unzoomed, zoomed in, and panned.
    async 'waveform-zoom-lines-up'(errors: string[]) {
      const BURST = 1.2;
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      });
      const p = await ctx.newPage();
      p.on('pageerror', (e) => errors.push(e.message));
      await p.route('https://cdn.freesound.org/**', (r) =>
        r.fulfill({
          status: 200,
          contentType: 'audio/wav',
          headers: { 'access-control-allow-origin': '*' },
          body: burstWav(3, BURST),
        }),
      );
      await p.goto(`${url}/index.html?v1=${comp([blk(1, 'Sample', 0, 0)])}`);
      await p.waitForFunction(() => (window as any).__bd_probe);
      await p.click('#start');
      await p.waitForFunction(
        () => (window as any).__bd_probe.samples.some((x: any) => x.loaded),
        null,
        { timeout: 10000 },
      );
      await p.waitForTimeout(1200);
      const [bx, by] = await toCss(p, 0, 0.5);
      await p.mouse.click(bx, by);
      await p.waitForTimeout(1200);
      // Where the burst is drawn (the loudest of the row's points, 0..1 across the row) and where the scale puts it.
      const look = () =>
        p.evaluate((at) => {
          const o = (window as any).__bd_probe.scene.OptionsPanel,
            w = (o.Options as any[]).find((x) => x.Type === 'waveregion');
          const wave = w.Waveform as number[],
            peak = wave.indexOf(Math.max(...wave));
          return {
            x: o.Position.x + o.Margin,
            y: o.Position.y + w.Position.y + w.Size.height / 2,
            w: o.Range,
            min: w.Min,
            max: w.Max,
            drawn: (peak + 0.5) / wave.length,
            scale: (at - w.Min) / (w.Max - w.Min),
            filled: wave.filter((x) => x > 0.02).length / wave.length,
          };
        }, BURST);
      const r: Record<string, any> = {};
      r.whole = await look();
      await p.mouse.move(r.whole.x + r.whole.w * 0.2, r.whole.y);
      for (let i = 0; i < 6; i++) {
        await p.mouse.wheel(0, -100);
        await p.waitForTimeout(40);
      }
      r.zoomed = await look();
      await p.mouse.wheel(Math.round(r.zoomed.w * 0.15), 0);
      await p.waitForTimeout(150);
      r.panned = await look();
      // All the way in, a notch at a time, about the burst: every step lines up and fills the row.
      r.steps = [];
      for (let i = 0; i < 44; i++) {
        const k = await look();
        await p.mouse.move(k.x + k.w * Math.min(0.95, Math.max(0.05, k.scale)), k.y);
        await p.mouse.wheel(0, -100);
        await p.waitForTimeout(40);
        r.steps.push(await look());
      }
      await ctx.close();
      const lined = (k: any) =>
        k.scale > 0.02 &&
        k.scale < 0.98 &&
        k.filled > 0.97 &&
        k.drawn > k.scale - 0.006 &&
        k.drawn < k.scale + 0.003 / (k.max - k.min) + 0.006; // in the 3 ms burst, ± one drawn point
      const steps = r.steps.map((k: any) => ({
        span: +(k.max - k.min).toFixed(4),
        off: +(k.drawn - k.scale).toFixed(3),
        filled: k.filled,
      }));
      return [
        lined(r.whole) &&
          lined(r.zoomed) &&
          lined(r.panned) &&
          r.zoomed.max - r.zoomed.min < 1.5 &&
          r.steps.every(lined) &&
          r.steps.at(-1).max - r.steps.at(-1).min < 0.02,
        { whole: r.whole, zoomed: r.zoomed, panned: r.panned, steps },
      ];
    },
    // The same in the plugins (owner's recording, 2026-11-20): their page never holds the audio, only the processor's
    // 4000-point preview, so a zoomed window holds few points. The waveform drew a part of the row only, shrinking as it
    // zoomed in, and snapped to whole points while the markers glided.
    async 'waveform-zoom-plugin-preview'(errors: string[]) {
      const { pg, close } = await openPlugin(
        plugPatch([{ id: 's', type: 'source.sample', x: 0, y: 0 }]),
        errors,
      );
      const id = (await pg.evaluate(() => (window as any).__bd_probe.state.blocks[0].id)) as number;
      let seed = 1;
      const noise = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return 0.15 + (0.1 * seed) / 2 ** 32;
      };
      const preview = Array.from({ length: 4000 }, (_, i) => (i >= 1599 && i < 1602 ? 1 : noise())); // a burst at 40 %
      const BURST = (3 * 1600.5) / 4000;
      await pg.evaluate(
        ([i, pv]) =>
          (window as any).__fire('bd_sampleInfo', {
            id: i,
            loading: false,
            missing: false,
            duration: 3,
            sampleRate: 44100,
            preview: pv,
            track: 'freesound:1',
          }),
        [id, preview] as const,
      );
      const [bx, by] = await pg.evaluate((i) => (window as any).__bd_probe.blockPoint(i), id);
      await pg.mouse.click(bx, by);
      await pg.waitForTimeout(1200);
      const look = () =>
        pg.evaluate((at) => {
          const o = (window as any).__bd_probe.scene.OptionsPanel,
            w = (o.Options as any[]).find((x) => x.Type === 'waveregion');
          const wave = w.Waveform as number[],
            peak = wave.indexOf(Math.max(...wave));
          return {
            x: o.Position.x + o.Margin,
            y: o.Position.y + w.Position.y + w.Size.height / 2,
            w: o.Range,
            min: w.Min,
            max: w.Max,
            drawn: (peak + 0.5) / wave.length,
            scale: (at - w.Min) / (w.Max - w.Min),
            filled: wave.filter((x) => x > 0.02).length / wave.length,
          };
        }, BURST);
      const steps: any[] = [await look()];
      // In a notch at a time, a little left of the burst (so it moves across the row), as far as the zoom goes; then a swipe.
      for (let i = 0; i < 22; i++) {
        const k = steps.at(-1);
        await pg.mouse.move(k.x + k.w * Math.max(0.05, k.scale - 0.1), k.y);
        await pg.mouse.wheel(0, -100);
        await pg.waitForTimeout(40);
        steps.push(await look());
      }
      await pg.mouse.wheel(Math.round(steps[0].w * 0.1), 0);
      await pg.waitForTimeout(150);
      steps.push(await look());
      await close();
      // The burst is 3 preview points wide (BURST is its middle): within half of that, plus one drawn point.
      const lined = (k: any) =>
        k.scale > 0.02 &&
        k.scale < 0.98 &&
        Math.abs(k.drawn - k.scale) < (1.5 * 3) / 4000 / (k.max - k.min) + 0.006;
      const ok =
        steps.every((k) => k.filled > 0.97) &&
        steps.every(lined) &&
        steps.at(-2).max - steps.at(-2).min < 0.35;
      return [
        ok,
        steps.map((k) => ({
          span: +(k.max - k.min).toFixed(4),
          off: +(k.drawn - k.scale).toFixed(3),
          filled: +k.filled.toFixed(3),
        })),
      ];
    },
  };
}
