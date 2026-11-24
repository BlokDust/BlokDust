// ui-regressions: Sampler blocks: regions, reversing, loading indicators and the waveform they draw.
import {
  OUT,
  blk,
  browser,
  cdn,
  maxChange,
  open,
  state,
  toCss,
  type Block,
  type RegressionTest,
} from './harness.ts';
import { decayWav, sineWav } from './wav.ts';
import { near, regionOf, waveBox, waveDrawn } from './samplerPanel.ts';

export const samplersTests: Record<string, RegressionTest> = {
  /** 1. Looping plays the region the panel shows (start, end, loop start/end); the panel shows all four handles. A newly
   * loaded sample resets the region (v1 Sample.SetBuffers) in the engine as well as the panel. */
  async 'sample-loop-region'(errors: string[]) {
    cdn.seconds = 3;
    const p = await open(browser, [blk(1, 'Sample', 0, 0)], errors);
    await p.waitForFunction(
      () => (window as any).__bd_probe.samples.some((x: any) => x.loaded),
      null,
      { timeout: 10000 },
    ); // default sound (3 s here)
    const id = (await state(p)).blocks[0].id;
    await p.evaluate(
      ([i, bytes]) =>
        (window as any).__bd_loadSample(i, 'one-second.wav', new Uint8Array(bytes).buffer),
      [id, [...decayWav(1)]] as const,
    );
    const [x, y] = await toCss(p, 0, 0.5);
    await p.mouse.click(x, y);
    await p.waitForTimeout(1200);
    const r = await regionOf(p, id);
    const handles = await p.evaluate(() => {
      const w = (window as any).__bd_probe.scene.OptionsPanel.Options.find(
        (Option: any) => Option.Type === 'waveregion',
      );
      return { mode: w?.Mode, handles: w?.Handles?.length };
    });
    await p.screenshot({ path: `${OUT}/sample-loop-region.png` });
    await p.close();
    return [
      near(r.ui, [0, 1, 0.5, 1]) &&
        near(r.patch, r.ui) &&
        handles.mode === true &&
        handles.handles === 4,
      { ui: r.ui, patch: r.patch, ...handles },
    ];
  },
  /** 2 + 3. Reverse acts at once: the waveform flips immediately (v1 SwitchBuffer) and the start/end and loop points are
   * mirrored, so the same stretch of audio stays selected and now plays backwards (owner request; v1 kept the numbers). */
  async 'sample-reverse-mirrors'(errors: string[]) {
    cdn.seconds = 2;
    const p = await open(browser, [blk(1, 'Sample', 0, 0)], errors);
    await p.waitForFunction(
      () => (window as any).__bd_probe.samples.some((x: any) => x.loaded),
      null,
      { timeout: 10000 },
    );
    const id = (await state(p)).blocks[0].id;
    const [x, y] = await toCss(p, 0, 0.5);
    await p.mouse.click(x, y);
    await p.waitForTimeout(1200);
    await p.evaluate(() => {
      const selectedBlock = (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock;
      selectedBlock.SetParam('startPosition', 0.2);
      selectedBlock.SetParam('endPosition', 1.6);
      selectedBlock.SetParam('loopStart', 0.5);
      selectedBlock.SetParam('loopEnd', 0.9);
    });
    const before = await regionOf(p, id);
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('reverse', true),
    );
    await p.waitForTimeout(100);
    const after = await regionOf(p, id);
    await p.screenshot({ path: `${OUT}/sample-reverse-mirrors.png` });
    await p.close();
    const flipped =
      after.wave.length > 0 &&
      JSON.stringify(after.wave) === JSON.stringify([...before.wave].reverse());
    return [
      flipped &&
        near(after.ui, [0.4, 1.8, 1.1, 1.5]) &&
        near(after.patch, after.ui) &&
        after.reverse.every(Boolean),
      {
        waveformFlippedWithin100ms: flipped,
        before: before.ui,
        after: after.ui,
        patch: after.patch,
      },
    ];
  },
  /** 2 + 6. While a sample downloads or decodes, v1's loading animation (AnimationsLayer: a spinning diamond in a bubble
   * beside the block) shows; the previous sound keeps playing until the new one is ready. */
  async 'sample-loading-indicator'(errors: string[]) {
    cdn.seconds = 1;
    cdn.delayMs = 6000; // the default sound starts loading with the page; check while it still is
    try {
      const p = await open(browser, [blk(1, 'Sample', 0, 0)], errors);
      const during = await p.evaluate(
        () => ((window as any).__bd_probe.scene.AnimationsLayer?.ActiveBlocks ?? []).length,
      );
      await p.screenshot({ path: `${OUT}/sample-loading-indicator.png` });
      await p.waitForFunction(
        () => (window as any).__bd_probe.samples.some((x: any) => x.loaded),
        null,
        { timeout: 10000 },
      );
      await p.waitForTimeout(200);
      const after = await p.evaluate(
        () => ((window as any).__bd_probe.scene.AnimationsLayer?.ActiveBlocks ?? []).length,
      );
      await p.close();
      return [during === 1 && after === 0, { loadingBlocksDuring: during, after }];
    } finally {
      cdn.delayMs = 0;
    }
  },
  /** The loading square in an open options panel's waveform spins while the sample loads (v1 RefreshOptionsPanel
   * ("animate") → OptionsPanel.Animating redraws the panel every frame). Owner review 2 of Phase 2, 2026-11-07. */
  async 'sample-region-spinner'(errors: string[]) {
    cdn.seconds = 1;
    cdn.delayMs = 8000;
    try {
      const p = await open(browser, [blk(1, 'Sample', 0, 0)], errors);
      const [x, y] = await toCss(p, 0, 0.5);
      await p.mouse.click(x, y);
      await p.waitForTimeout(1000);
      const box = await p.evaluate(() => {
        const optionsPanel = (window as any).__bd_probe.scene.OptionsPanel,
          w = optionsPanel.Options.find((Option: any) => Option.Type === 'waveregion'),
          pr = devicePixelRatio;
        return {
          x: (optionsPanel.Position.x + optionsPanel.Margin) / pr,
          y: (optionsPanel.Position.y + w.Position.y) / pr,
          width: optionsPanel.Range / pr,
          height: w.Size.height / pr,
        };
      });
      const change = await maxChange(p, box, 300);
      await p.screenshot({ path: `${OUT}/sample-region-spinner.png` });
      await p.close();
      return [change > 40, { maxPixelChangeIn300ms: change }];
    } finally {
      cdn.delayMs = 0;
    }
  },
  /** Sampler blocks show their audio's waveform in the options panel (v1 waveregion/waveimage options). */
  async 'sampler-waveforms'(errors) {
    const seen: Record<string, number> = {};
    for (const [type, load] of [
      ['Sample', true],
      ['SampleGen', false],
      ['Convolver', false],
      ['Granular', true],
    ] as const) {
      const p = await open(browser, [blk(1, type, 0, 0)], errors);
      if (load) {
        const id = (await state(p)).blocks[0].id;
        await p.evaluate(
          ([i, bytes]) =>
            (window as any).__bd_loadSample(i, 'sine.wav', new Uint8Array(bytes).buffer),
          [id, sineWav()] as const,
        );
      }
      const [x, y] = await toCss(p, 0, 0.5);
      await p.mouse.click(x, y);
      await p.waitForTimeout(1500);
      seen[type] = await waveDrawn(p);
      await p.screenshot({ path: `${OUT}/waveform-${type}.png` });
      await p.close();
    }
    return [Object.values(seen).every((n) => n > 0), { waveformPoints: seen }];
  },
  // Owner (2026-11-14): Looping off still showed the loop markers on a Sample's waveform, and on again a Recorder's
  // showed only Start and End: the panel was not drawn again when the switch changed (v1 Sample.SetParam('loop') is).
  async 'looping-switch-redraws-waveform'(errors: string[]) {
    const r: Record<string, unknown> = {};
    for (const type of ['Sample', 'Recorder']) {
      const p = await open(browser, [blk(1, type, 0, 0)], errors);
      const [x, y] = await toCss(p, 0, 0);
      await p.mouse.click(x + 8, y + 8);
      await p.waitForTimeout(1000);
      const mode = () =>
        p.evaluate(() => {
          const optionsPanel = (window as any).__bd_probe.scene.OptionsPanel;
          return {
            loop: !!optionsPanel.SelectedBlock.Params.loop,
            mode: !!(optionsPanel.Options as any[]).find((x) => x.Type === 'waveregion')?.Mode,
          };
        });
      const seen = [await mode()];
      for (const v of [false, true, false]) {
        await p.evaluate(
          (on) => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('loop', on),
          v,
        );
        await p.waitForTimeout(200);
        seen.push(await mode());
      }
      await p.close();
      r[type] = seen;
    }
    const ok = (seen: any[]) =>
      seen.every((s) => s.loop === s.mode) &&
      seen.map((s) => s.loop).join() === [seen[0].loop, false, true, false].join();
    return [ok(r.Sample as any[]) && ok(r.Recorder as any[]), r];
  },
  /** Owner (new in v2): while a sampler's options are open, its waveform shows where it is playing: a line per
   * sounding voice (Sample) and one per grain (Granular), moving as it plays. */
  async 'waveform-playheads'(errors: string[]) {
    cdn.seconds = 3;
    const p = await open(
      browser,
      [
        { ...blk(1, 'Sample', 0, 0), Params: { loop: true } } as Block,
        blk(2, 'Power', -3, 0),
        blk(3, 'Granular', 12, 0),
        blk(4, 'Power', 9, 0),
      ],
      errors,
    );
    await p.waitForFunction(
      () => (window as any).__bd_probe.samples.filter((x: any) => x.loaded).length === 2,
      null,
      { timeout: 10000 },
    );
    const lines = () =>
      p.evaluate(() => (window as any).__bd_probe.scene.playheadLines()?.xs ?? null);
    const look = async (gx: number, shot: string) => {
      const [x, y] = await toCss(p, gx, 0.5);
      await p.mouse.click(x, y);
      await p.waitForTimeout(1200);
      const a = await lines();
      await p.waitForTimeout(300);
      const b = await lines();
      await p.screenshot({ path: `${OUT}/${shot}.png` });
      await p.mouse.click(1100, 720);
      await p.waitForTimeout(700);
      return { a, b };
    };
    const sample = await look(0, 'waveform-playheads-sample');
    const granular = await look(12, 'waveform-playheads-granular');
    await p.close();
    const moved = (r: { a: number[] | null; b: number[] | null }) =>
      !!r.a && !!r.b && JSON.stringify(r.a) !== JSON.stringify(r.b);
    const ok =
      sample.a?.length === 1 && moved(sample) && (granular.a?.length ?? 0) >= 1 && moved(granular);
    return [ok, { sample, granular }];
  },
  /** Granular shows v1's loading animation while its sound downloads, like Sample and Convolver: the bubble by the
   * block, and the spinning square in its open panel's waveform. */
  async 'granular-loading-spinner'(errors: string[]) {
    cdn.seconds = 2;
    cdn.delayMs = 0;
    try {
      const p = await open(browser, [blk(1, 'Granular', 0, 0)], errors);
      await p.waitForFunction(
        () => (window as any).__bd_probe.samples.some((x: any) => x.loaded),
        null,
        { timeout: 10000 },
      );
      const [x, y] = await toCss(p, 0, 0.5);
      await p.mouse.click(x, y);
      await p.waitForTimeout(1200);
      cdn.delayMs = 8000; // a sound picked in the panel's search (v1 LoadTrack) takes a while to arrive
      await p.evaluate(() => {
        const selectedBlock = (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock;
        selectedBlock.LoadTrack({
          TitleShort: 'PAD',
          UserShort: 'SOMEONE',
          Permalink: '',
          Sound: {
            id: 77,
            name: 'Pad',
            username: 'someone',
            license: 'CC0',
            licenseUrl: '',
            duration: 4,
            preview: 'https://cdn.freesound.org/previews/0/77_1-hq.mp3',
            url: 'https://freesound.org/s/77/',
          },
        });
      });
      await p.waitForTimeout(300);
      const bubble = await p.evaluate(
        () => (window as any).__bd_probe.scene.AnimationsLayer.ActiveBlocks.length,
      );
      const change = await maxChange(p, await waveBox(p), 300);
      await p.screenshot({ path: `${OUT}/granular-loading-spinner.png` });
      await p.close();
      return [bubble === 1 && change > 40, { bubble, panelPixelChangeIn300ms: change }];
    } finally {
      cdn.delayMs = 0;
    }
  },
  /** Granular's LOCATION waveform (v1 WaveSlider): the spawn line and the spread lines show as soon as a sound is
   * loaded (the slider knows the file's length); Spread widens the lines; dragging on the waveform moves the spawn
   * point (the region param the grains play from). */
  async 'granular-waveslider'(errors: string[]) {
    cdn.seconds = 2;
    const p = await open(browser, [blk(1, 'Granular', 0, 0)], errors);
    await p.waitForFunction(
      () => (window as any).__bd_probe.samples.some((x: any) => x.loaded),
      null,
      { timeout: 10000 },
    );
    const [x, y] = await toCss(p, 0, 0.5);
    await p.mouse.click(x, y);
    await p.waitForTimeout(1200);
    const slider = () =>
      p.evaluate(() => {
        const optionsPanel = (window as any).__bd_probe.scene.OptionsPanel,
          w = optionsPanel.Options.find((Option: any) => Option.Type === 'waveslider');
        return {
          max: w?.Max,
          value: w?.Value,
          spread: w?.Spread,
          wave: w?.Waveform?.length ?? 0,
          region: optionsPanel.SelectedBlock?.Params.region,
        };
      });
    const start = await slider();
    // Drag the Spread slider's handle right by a quarter of its range (+1 s of the 0–4 range).
    const handle = await p.evaluate(() => {
      const optionsPanel = (window as any).__bd_probe.scene.OptionsPanel,
        w = optionsPanel.Options.find((Option: any) => Option.Name === 'Spread'),
        pr = devicePixelRatio;
      return {
        x: (optionsPanel.Position.x + optionsPanel.Margin + w.Position.x) / pr,
        y: (optionsPanel.Position.y + w.Position.y + w.Size.height / 2) / pr,
        range: optionsPanel.Range / pr,
      };
    });
    await p.mouse.move(handle.x, handle.y);
    await p.mouse.down();
    await p.mouse.move(handle.x + handle.range * 0.25, handle.y, { steps: 5 });
    await p.mouse.up();
    await p.waitForTimeout(100);
    const spreadUi = (await slider()).spread;
    const box = await waveBox(p);
    await p.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
    await p.mouse.down();
    await p.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2, { steps: 5 });
    await p.waitForTimeout(100);
    await p.screenshot({ path: `${OUT}/granular-waveslider.png` });
    await p.mouse.up();
    await p.waitForTimeout(100);
    const dragged = await slider();
    const patchRegion = (await state(p)).patch.blocks[0].params.region;
    await p.close();
    const ok =
      start.max > 1.9 &&
      start.wave > 0 &&
      Math.abs(start.value - 1) < 0.05 &&
      Math.abs(spreadUi - 2.5) < 0.1 &&
      Math.abs(dragged.region - 0.5) < 0.1 &&
      Math.abs(patchRegion - dragged.region) < 1e-6;
    return [ok, { start, spreadUi, dragged, patchRegion }];
  },
};
