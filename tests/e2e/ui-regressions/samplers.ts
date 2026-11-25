// ui-regressions: sampler blocks: regions, reversing, loading indicators and their waveforms.
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
import type { V1BlockView } from './v1Views.ts';

export const samplersTests: Record<string, RegressionTest> = {
  /** Looping plays the region the panel shows, with all four handles; a newly loaded sample resets
   * the region (v1 Sample.SetBuffers) in the engine as well as the panel. */
  async 'sample-loop-region'(errors: string[]) {
    cdn.seconds = 3;
    const page = await open(browser, [blk(1, 'Sample', 0, 0)], errors);
    // The default sound (3 s here).
    await page.waitForFunction(() => window.__bd_probe.samples.some((x) => x.loaded), null, {
      timeout: 10000,
    });
    const id = (await state(page)).blocks[0].id;
    await page.evaluate(
      ([i, bytes]) => window.__bd_loadSample(i, 'one-second.wav', new Uint8Array(bytes).buffer),
      [id, [...decayWav(1)]] as const,
    );
    const [x, y] = await toCss(page, 0, 0.5);
    await page.mouse.click(x, y);
    await page.waitForTimeout(1200);
    const result = await regionOf(page, id);
    const handles = await page.evaluate(() => {
      const option = window.__bd_probe.scene.OptionsPanel.Options.find(
        (Option) => Option.Type === 'waveregion',
      );
      return { mode: option?.Mode, handles: option?.Handles.length };
    });
    await page.screenshot({ path: `${OUT}/sample-loop-region.png` });
    await page.close();
    return [
      near(result.ui, [0, 1, 0.5, 1]) &&
        near(result.patch, result.ui) &&
        handles.mode === true &&
        handles.handles === 4,
      { ui: result.ui, patch: result.patch, ...handles },
    ];
  },
  /** Reverse flips the waveform at once (v1 SwitchBuffer) and mirrors the start, end and loop
   * points, so the same stretch stays selected and plays backwards (v1 kept the numbers). */
  async 'sample-reverse-mirrors'(errors: string[]) {
    cdn.seconds = 2;
    const page = await open(browser, [blk(1, 'Sample', 0, 0)], errors);
    await page.waitForFunction(() => window.__bd_probe.samples.some((x) => x.loaded), null, {
      timeout: 10000,
    });
    const id = (await state(page)).blocks[0].id;
    const [x, y] = await toCss(page, 0, 0.5);
    await page.mouse.click(x, y);
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      const selectedBlock = window.__bd_probe.scene.OptionsPanel.SelectedBlock as V1BlockView;
      selectedBlock.SetParam('startPosition', 0.2);
      selectedBlock.SetParam('endPosition', 1.6);
      selectedBlock.SetParam('loopStart', 0.5);
      selectedBlock.SetParam('loopEnd', 0.9);
    });
    const before = await regionOf(page, id);
    await page.evaluate(() => {
      (window.__bd_probe.scene.OptionsPanel.SelectedBlock as V1BlockView).SetParam('reverse', true);
    });
    await page.waitForTimeout(100);
    const after = await regionOf(page, id);
    await page.screenshot({ path: `${OUT}/sample-reverse-mirrors.png` });
    await page.close();
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
  /** While a sample downloads or decodes, v1's loading bubble shows beside the block; the previous
   * sound keeps playing until the new one is ready. */
  async 'sample-loading-indicator'(errors: string[]) {
    cdn.seconds = 1;
    cdn.delayMs = 6000; // the default sound loads with the page: checked while it still is
    try {
      const page = await open(browser, [blk(1, 'Sample', 0, 0)], errors);
      const during = await page.evaluate(
        () => window.__bd_probe.scene.AnimationsLayer.ActiveBlocks.length,
      );
      await page.screenshot({ path: `${OUT}/sample-loading-indicator.png` });
      await page.waitForFunction(() => window.__bd_probe.samples.some((x) => x.loaded), null, {
        timeout: 10000,
      });
      await page.waitForTimeout(200);
      const after = await page.evaluate(
        () => window.__bd_probe.scene.AnimationsLayer.ActiveBlocks.length,
      );
      await page.close();
      return [during === 1 && after === 0, { loadingBlocksDuring: during, after }];
    } finally {
      cdn.delayMs = 0;
    }
  },
  /** The loading square in an open panel's waveform spins while the sample loads (v1
   * RefreshOptionsPanel("animate"): OptionsPanel.Animating redraws every frame). */
  async 'sample-region-spinner'(errors: string[]) {
    cdn.seconds = 1;
    cdn.delayMs = 8000;
    try {
      const page = await open(browser, [blk(1, 'Sample', 0, 0)], errors);
      const [x, y] = await toCss(page, 0, 0.5);
      await page.mouse.click(x, y);
      await page.waitForTimeout(1000);
      const box = await page.evaluate(() => {
        const optionsPanel = window.__bd_probe.scene.OptionsPanel,
          option = optionsPanel.Options.find((Option) => Option.Type === 'waveregion'),
          pr = devicePixelRatio;
        if (!option) throw new Error('no waveregion option');
        return {
          x: (optionsPanel.Position.x + optionsPanel.Margin) / pr,
          y: (optionsPanel.Position.y + option.Position.y) / pr,
          width: optionsPanel.Range / pr,
          height: option.Size.height / pr,
        };
      });
      const change = await maxChange(page, box, 300);
      await page.screenshot({ path: `${OUT}/sample-region-spinner.png` });
      await page.close();
      return [change > 40, { maxPixelChangeIn300ms: change }];
    } finally {
      cdn.delayMs = 0;
    }
  },
  /** Sampler blocks show their audio's waveform in the options panel (v1 waveregion, waveimage). */
  async 'sampler-waveforms'(errors) {
    const seen: Record<string, number> = {};
    for (const [type, load] of [
      ['Sample', true],
      ['SampleGen', false],
      ['Convolver', false],
      ['Granular', true],
    ] as const) {
      const page = await open(browser, [blk(1, type, 0, 0)], errors);
      if (load) {
        const id = (await state(page)).blocks[0].id;
        await page.evaluate(
          ([i, bytes]) => window.__bd_loadSample(i, 'sine.wav', new Uint8Array(bytes).buffer),
          [id, sineWav()] as const,
        );
      }
      const [x, y] = await toCss(page, 0, 0.5);
      await page.mouse.click(x, y);
      await page.waitForTimeout(1500);
      seen[type] = await waveDrawn(page);
      await page.screenshot({ path: `${OUT}/waveform-${type}.png` });
      await page.close();
    }
    return [Object.values(seen).every((points) => points > 0), { waveformPoints: seen }];
  },
  // Switching Looping redraws the waveform (v1 Sample.SetParam('loop') does): it kept showing loop
  // markers when off, and only Start and End when on again.
  async 'looping-switch-redraws-waveform'(errors: string[]) {
    const result: Record<string, { loop: boolean; mode: boolean }[]> = {};
    for (const type of ['Sample', 'Recorder']) {
      const page = await open(browser, [blk(1, type, 0, 0)], errors);
      const [x, y] = await toCss(page, 0, 0);
      await page.mouse.click(x + 8, y + 8);
      await page.waitForTimeout(1000);
      const mode = () =>
        page.evaluate(() => {
          const optionsPanel = window.__bd_probe.scene.OptionsPanel;
          return {
            loop: !!(optionsPanel.SelectedBlock as V1BlockView).Params.loop,
            mode: !!optionsPanel.Options.find((x) => x.Type === 'waveregion')?.Mode,
          };
        });
      const seen = [await mode()];
      for (const looping of [false, true, false]) {
        await page.evaluate((on) => {
          (window.__bd_probe.scene.OptionsPanel.SelectedBlock as V1BlockView).SetParam('loop', on);
        }, looping);
        await page.waitForTimeout(200);
        seen.push(await mode());
      }
      await page.close();
      result[type] = seen;
    }
    const ok = (seen: { loop: boolean; mode: boolean }[]) =>
      seen.every((step) => step.loop === step.mode) &&
      seen.map((step) => step.loop).join() === [seen[0].loop, false, true, false].join();
    return [ok(result.Sample) && ok(result.Recorder), result];
  },
  /** New in v2: an open sampler's waveform shows where it plays, a line per sounding voice (Sample)
   * or grain (Granular), moving as it plays. */
  async 'waveform-playheads'(errors: string[]) {
    cdn.seconds = 3;
    const page = await open(
      browser,
      [
        { ...blk(1, 'Sample', 0, 0), Params: { loop: true } } as Block,
        blk(2, 'Power', -3, 0),
        blk(3, 'Granular', 12, 0),
        blk(4, 'Power', 9, 0),
      ],
      errors,
    );
    await page.waitForFunction(
      () => window.__bd_probe.samples.filter((x) => x.loaded).length === 2,
      null,
      { timeout: 10000 },
    );
    const lines = () => page.evaluate(() => window.__bd_probe.scene.playheadLines()?.xs ?? null);
    const look = async (gx: number, shot: string) => {
      const [x, y] = await toCss(page, gx, 0.5);
      await page.mouse.click(x, y);
      await page.waitForTimeout(1200);
      const a = await lines();
      await page.waitForTimeout(300);
      const b = await lines();
      await page.screenshot({ path: `${OUT}/${shot}.png` });
      await page.mouse.click(1100, 720);
      await page.waitForTimeout(700);
      return { a, b };
    };
    const sample = await look(0, 'waveform-playheads-sample');
    const granular = await look(12, 'waveform-playheads-granular');
    await page.close();
    const moved = (result: { a: number[] | null; b: number[] | null }) =>
      !!result.a && !!result.b && JSON.stringify(result.a) !== JSON.stringify(result.b);
    const ok =
      sample.a?.length === 1 && moved(sample) && (granular.a?.length ?? 0) >= 1 && moved(granular);
    return [ok, { sample, granular }];
  },
  /** Granular shows v1's loading animation while its sound downloads, as Sample and Convolver:
   * the bubble by the block and the spinning square in its open panel's waveform. */
  async 'granular-loading-spinner'(errors: string[]) {
    cdn.seconds = 2;
    cdn.delayMs = 0;
    try {
      const page = await open(browser, [blk(1, 'Granular', 0, 0)], errors);
      await page.waitForFunction(() => window.__bd_probe.samples.some((x) => x.loaded), null, {
        timeout: 10000,
      });
      const [x, y] = await toCss(page, 0, 0.5);
      await page.mouse.click(x, y);
      await page.waitForTimeout(1200);
      cdn.delayMs = 8000; // a sound picked in the search (v1 LoadTrack) takes a while to arrive
      await page.evaluate(() => {
        const selectedBlock = window.__bd_probe.scene.OptionsPanel.SelectedBlock as V1BlockView;
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
      await page.waitForTimeout(300);
      const bubble = await page.evaluate(
        () => window.__bd_probe.scene.AnimationsLayer.ActiveBlocks.length,
      );
      const change = await maxChange(page, await waveBox(page), 300);
      await page.screenshot({ path: `${OUT}/granular-loading-spinner.png` });
      await page.close();
      return [bubble === 1 && change > 40, { bubble, panelPixelChangeIn300ms: change }];
    } finally {
      cdn.delayMs = 0;
    }
  },
  /** Granular's LOCATION waveform (v1 WaveSlider) shows spawn and spread lines once a sound loads;
   * Spread widens them, and dragging the waveform moves the spawn point (`region`). */
  async 'granular-waveslider'(errors: string[]) {
    cdn.seconds = 2;
    const page = await open(browser, [blk(1, 'Granular', 0, 0)], errors);
    await page.waitForFunction(() => window.__bd_probe.samples.some((x) => x.loaded), null, {
      timeout: 10000,
    });
    const [x, y] = await toCss(page, 0, 0.5);
    await page.mouse.click(x, y);
    await page.waitForTimeout(1200);
    const slider = () =>
      page.evaluate(() => {
        const optionsPanel = window.__bd_probe.scene.OptionsPanel,
          option = optionsPanel.Options.find((Option) => Option.Type === 'waveslider');
        return {
          max: option?.Max,
          value: option?.Value,
          spread: option?.Spread,
          wave: option?.Waveform.length ?? 0,
          region: (optionsPanel.SelectedBlock as V1BlockView | undefined)?.Params.region,
        };
      });
    const start = await slider();
    // Drag the Spread slider's handle right by a quarter of its range (+1 s of the 0–4 range).
    const handle = await page.evaluate(() => {
      const optionsPanel = window.__bd_probe.scene.OptionsPanel,
        option = optionsPanel.Options.find((Option) => Option.Name === 'Spread'),
        pr = devicePixelRatio;
      if (!option) throw new Error('no Spread option');
      return {
        x: (optionsPanel.Position.x + optionsPanel.Margin + option.Position.x) / pr,
        y: (optionsPanel.Position.y + option.Position.y + option.Size.height / 2) / pr,
        range: optionsPanel.Range / pr,
      };
    });
    await page.mouse.move(handle.x, handle.y);
    await page.mouse.down();
    await page.mouse.move(handle.x + handle.range * 0.25, handle.y, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(100);
    const spreadUi = (await slider()).spread;
    const box = await waveBox(page);
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2, { steps: 5 });
    await page.waitForTimeout(100);
    await page.screenshot({ path: `${OUT}/granular-waveslider.png` });
    await page.mouse.up();
    await page.waitForTimeout(100);
    const dragged = await slider();
    const patchRegion = (await state(page)).patch.blocks[0].params?.region;
    await page.close();
    const ok =
      (start.max ?? NaN) > 1.9 &&
      start.wave > 0 &&
      Math.abs((start.value ?? NaN) - 1) < 0.05 &&
      Math.abs((spreadUi ?? NaN) - 2.5) < 0.1 &&
      Math.abs(Number(dragged.region) - 0.5) < 0.1 &&
      Math.abs(Number(patchRegion) - Number(dragged.region)) < 1e-6;
    return [ok, { start, spreadUi, dragged, patchRegion }];
  },
};
