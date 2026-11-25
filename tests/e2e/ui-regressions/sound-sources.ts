// ui-regressions: made and downloaded sounds: SampleGen, Granular, Convolver, Freesound, Envelope.
import {
  OUT,
  blk,
  browser,
  cdn,
  maxOver,
  open,
  state,
  toCss,
  type RegressionTest,
} from './harness.ts';
import { sineWav } from './wav.ts';
import type { V1BlockView } from './v1Views.ts';

export const soundSourcesTests: Record<string, RegressionTest> = {
  /** SampleGen makes its sound (v1 generator) and plays it while held; the patch keeps its recipe. */
  async 'samplegen-plays'(errors) {
    const page = await open(browser, [blk(1, 'SampleGen', 0, 0)], errors);
    const [x, y] = await toCss(page, 0, 0.5);
    await page.mouse.move(x, y);
    await page.mouse.down();
    const held = await maxOver(page, 'rms', 1000);
    await page.mouse.up();
    const seed = (await state(page)).patch.blocks[0].params?.seed as
      { waveVoices?: unknown } | undefined;
    await page.close();
    const voices = Array.isArray(seed?.waveVoices) ? seed.waveVoices.length : undefined;
    return [
      held > 0.002 && voices !== undefined && voices > 0,
      { holdingSampleGen: held, savedVoices: voices },
    ];
  },
  /** Granular with a loaded file plays grains while held (CHG-0004). */
  async 'granular-plays'(errors) {
    const page = await open(browser, [blk(1, 'Granular', 0, 0)], errors);
    const id = (await state(page)).blocks[0].id;
    await page.evaluate(
      ([i, bytes]) => window.__bd_loadSample(i, 'sine.wav', new Uint8Array(bytes).buffer),
      [id, sineWav()] as const,
    );
    const [x, y] = await toCss(page, 0, 0.5);
    await page.mouse.move(x, y);
    await page.mouse.down();
    const held = await maxOver(page, 'rms', 1000);
    await page.mouse.up();
    await page.close();
    return [held > 0.005, { holdingGranular: held }];
  },
  /** The Convolver uses only 2.5 s of an impulse response (kMaxImpulseSeconds), so it downloads
   * only the start of a Freesound preview (an HTTP Range request). */
  async 'convolver-downloads-only-what-it-uses'(errors: string[]) {
    cdn.seconds = 1;
    cdn.requests = [];
    const page = await open(browser, [blk(1, 'Convolver', 0, 0)], errors);
    const id = (await state(page)).blocks[0].id;
    await page.evaluate((i) => {
      window.__bd_probe.scene.host.loadFreesound(
        i,
        {
          id: 42,
          name: 'Big Hall IR',
          username: 'someone',
          license: 'CC0',
          licenseUrl: '',
          duration: 12,
          preview: 'https://cdn.freesound.org/previews/0/42_1-hq.mp3',
          url: 'https://freesound.org/s/42/',
        },
        { trackName: 'BIG HALL IR', user: 'Someone', permalink: '' },
      );
    }, id);
    await page
      .waitForFunction(
        () => window.__bd_probe.samples.some((x) => x.loaded && x.track === 'freesound:42'),
        null,
        { timeout: 10000 },
      )
      .catch(() => {});
    await page.close();
    const req = cdn.requests.find((request) => request.url.includes('/42_'));
    const end = Number(req?.range?.match(/^bytes=0-(\d+)$/)?.[1] ?? NaN);
    return [Number.isFinite(end) && end < 200_000, { range: req?.range ?? 'none (whole file)' }];
  },
  // The Freesound results show each sound's length after its author ("By User · 1:05").
  async 'freesound-results-show-length'(errors: string[]) {
    const page = await open(browser, [blk(1, 'Sample', 0, 0)], errors);
    const [x, y] = await toCss(page, 0, 0);
    await page.mouse.click(x + 8, y + 8);
    await page.waitForTimeout(1000); // the block: its options panel
    await page.evaluate(() => {
      const scene = window.__bd_probe.scene,
        seen: string[] = (window.__texts = []);
      const proto = CanvasRenderingContext2D.prototype,
        drawText = Object.getOwnPropertyDescriptor(proto, 'fillText')
          ?.value as typeof proto.fillText;
      proto.fillText = function (text: string, ...rest: [number, number, number?]) {
        seen.push(text);
        drawText.call(this, text, ...rest);
      };
      const sound = (id: number, name: string, username: string, duration: number) => ({
        provider: 'freesound' as const,
        id,
        name,
        username,
        duration,
        license: 'CC0' as const,
        licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/',
        preview: `https://cdn.freesound.org/previews/${id}.mp3`,
        url: `https://freesound.org/s/${id}/`,
      });
      scene.host.searchSamples = () =>
        Promise.resolve([sound(1, 'Short hit', 'alice', 0.4), sound(2, 'Long pad', 'bob', 65.2)]);
      (scene.OptionsPanel.SelectedBlock as V1BlockView).SearchString = 'pad';
      scene.SoundcloudPanel.OpenPanel();
      scene.SoundcloudPanel.Submit();
    });
    await page.waitForTimeout(1500);
    const result = await page.evaluate(() => ({
      open: window.__bd_probe.scene.SoundcloudPanel.Open,
      texts: [...new Set((window.__texts ?? []).filter((text) => text.startsWith('By ')))],
    }));
    await page.screenshot({ path: `${OUT}/freesound-results-show-length.png` });
    await page.close();
    return [
      result.open &&
        result.texts.includes('By Alice · 0:01') &&
        result.texts.includes('By Bob · 1:05'),
      result,
    ];
  },
  // CHG-0035: SampleGen's SOUND slider picks a wave by number (GENERATE WAVE rolled a random one),
  // and a number is always the same wave.
  async 'sample-gen-sound-slider'(errors: string[]) {
    const page = await open(browser, [blk(1, 'SampleGen', 0, 0)], errors);
    const [x, y] = await toCss(page, 0, 0);
    await page.mouse.click(x + 8, y + 8);
    await page.waitForTimeout(1200);
    const form = await page.evaluate(() =>
      window.__bd_probe.scene.OptionsPanel.Options.map((option) => option.Setting),
    );
    const now = () =>
      page.evaluate(() => {
        const b = window.__bd_probe.scene.OptionsPanel.SelectedBlock as V1BlockView;
        return { wave: b.WaveForm.join(), sound: b.Params.sound as number };
      });
    const wave = async (sound: number) => {
      // A number set and let go, as a release does.
      await page.evaluate((k) => {
        const scene = window.__bd_probe.scene,
          b = scene.OptionsPanel.SelectedBlock as V1BlockView;
        b.SetParam('sound', k);
        scene.host.setSound(b.Id, k, true);
      }, sound);
      await page.waitForFunction(
        (k) => {
          const b = window.__bd_probe.scene.OptionsPanel.SelectedBlock as V1BlockView;
          return b.Params.sound === k && b.WaveForm.length > 0;
        },
        sound,
        { timeout: 10000 },
      );
      await page.waitForTimeout(300);
      return page.evaluate(() => {
        const b = window.__bd_probe.scene.OptionsPanel.SelectedBlock as V1BlockView;
        return {
          wave: b.WaveForm.join(),
          sound: window.__bd_probe.state.patch.blocks[0].params?.sound,
        };
      });
    };
    const a = await wave(5),
      b2 = await wave(6),
      a2 = await wave(5);
    // The wave is made on release, not while dragging; the number stays on show.
    const row = await page.evaluate(() => {
      const optionsPanel = window.__bd_probe.scene.OptionsPanel,
        pr = window.__bd_probe.v1App.Metrics.PixelRatio,
        slider = optionsPanel.Options.find((x) => x.Setting === 'sound');
      if (!slider) throw new Error('no SOUND slider');
      return {
        x0: (optionsPanel.Position.x + optionsPanel.Margin) / pr,
        w: optionsPanel.Range / pr,
        y: (optionsPanel.Position.y + slider.Position.y + slider.Size.height / 2) / pr,
        handle: (optionsPanel.Position.x + optionsPanel.Margin + slider.Position.x) / pr,
      };
    });
    const before = await now();
    await page.mouse.move(row.handle, row.y);
    await page.mouse.down();
    await page.mouse.move(row.x0 + row.w * 0.3, row.y, { steps: 8 });
    await page.mouse.move(row.x0 + row.w * 0.5, row.y, { steps: 8 });
    await page.waitForTimeout(400);
    const during = await now();
    await page.mouse.up();
    await page
      .waitForFunction(
        (previous) => {
          const b = window.__bd_probe.scene.OptionsPanel.SelectedBlock as V1BlockView;
          return b.WaveForm.length > 0 && b.WaveForm.join() !== previous;
        },
        before.wave,
        { timeout: 10000 },
      )
      .catch(() => {});
    await page.waitForTimeout(500);
    const after = await now();
    await page.evaluate(() => {
      const seen: string[] = (window.__texts = []),
        proto = CanvasRenderingContext2D.prototype,
        drawText = Object.getOwnPropertyDescriptor(proto, 'fillText')
          ?.value as typeof proto.fillText;
      proto.fillText = function (text: string, ...rest: [number, number, number?]) {
        seen.push(text);
        drawText.call(this, text, ...rest);
      };
      (window.__bd_probe.scene.OptionsPanel.SelectedBlock as V1BlockView).RefreshOptionsPanel();
    });
    await page.mouse.move(row.x0 - 200, row.y + 200);
    await page.waitForTimeout(600);
    const shown = await page.evaluate(
      (sound) => (window.__texts ?? []).includes(`#${sound}`),
      after.sound,
    );
    await page.screenshot({ path: `${OUT}/sample-gen-sound-slider.png` });
    await page.close();
    const pass =
      form.includes('sound') &&
      !form.includes('generate') &&
      a.wave === a2.wave &&
      a.wave !== b2.wave &&
      a.sound === 5 &&
      during.sound > 100 &&
      during.wave === before.wave &&
      after.wave !== before.wave &&
      after.sound === during.sound &&
      shown;
    return [
      pass,
      {
        form,
        same: a.wave === a2.wave,
        differs: a.wave !== b2.wave,
        saved: a.sound,
        dragged: during.sound,
        waveHeldWhileDragging: during.wave === before.wave,
        madeOnRelease: after.wave !== before.wave,
        numberShown: shown,
      },
    ];
  },
  // Envelope time handles sit on a log axis (v1's put all under 100 ms in 2 px), follow the pointer
  // from where grabbed, move a tenth as fast with Shift; overlapping, the nearest wins (adsrPanel).
  async 'envelope-short-attack'(errors: string[]) {
    const page = await open(browser, [blk(1, 'Envelope', 0, 0)], errors);
    const [bx, by] = await toCss(page, 0, 0.5);
    await page.mouse.click(bx, by);
    await page.waitForTimeout(1200);
    const geo = () =>
      page.evaluate(() => {
        const probe = window.__bd_probe,
          optionsPanel = probe.scene.OptionsPanel,
          envelope = optionsPanel.Options.find((x) => x.Type === 'ADSR');
        if (!envelope) throw new Error('no envelope graph');
        const handles = envelope.Handles;
        const x0 = optionsPanel.Position.x + optionsPanel.Margin,
          y0 = optionsPanel.Position.y + envelope.Position.y,
          ht = envelope.Size.height;
        return {
          attack: handles[0].XValue,
          decay: handles[1].XValue,
          sustain: handles[1].YValue,
          range: handles[0].XRange,
          a: [x0 + handles[0].Position.x, y0 + ht * 0.1],
          d: [
            x0 + handles[0].Position.x + handles[1].Position.x,
            y0 + ht * 0.9 - handles[1].Position.y,
          ],
          engine: probe.state.patch.blocks.find((b) => b.type === 'fx.envelope')?.params ?? {},
        };
      });
    const result: Record<string, unknown> = {};
    const g0 = await geo();
    result.start = { attack: g0.attack, x: g0.a[0], range: g0.range };
    // 1. a press beside the handle moves nothing
    await page.mouse.move(g0.a[0] + 4, g0.a[1]);
    await page.mouse.down();
    await page.mouse.move(g0.a[0] + 4, g0.a[1] + 1);
    await page.mouse.up();
    await page.waitForTimeout(100);
    const g1 = await geo();
    result.press = g1.attack;
    // 2. Dragged to a tenth of its track: ~19 ms on the log axis (v1's straight axis: 0.5 s).
    await page.mouse.move(g1.a[0], g1.a[1]);
    await page.mouse.down();
    // Attack 1 s sits at ln(100)/ln(500) of the track.
    const track0 = g1.a[0] - (g1.range * Math.log(100)) / Math.log(500);
    await page.mouse.move(track0 + g1.range * 0.1, g1.a[1], { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const g2 = await geo();
    const tenth = { attack: g2.attack, engine: Number(g2.engine.attack) };
    result.tenth = tenth;
    // 3. With Shift, 40 px of pointer is 4 px of handle.
    await page.mouse.move(g2.a[0], g2.a[1]);
    await page.mouse.down();
    await page.keyboard.down('Shift');
    await page.mouse.move(g2.a[0] + 40, g2.a[1], { steps: 8 });
    await page.keyboard.up('Shift');
    await page.mouse.up();
    await page.waitForTimeout(100);
    const g3 = await geo();
    const fine = { moved: g3.a[0] - g2.a[0], attack: g3.attack };
    result.fine = fine;
    await page.screenshot({ path: `${OUT}/envelope-short-attack.png` });
    // 4. Attack and decay short, sustain high: the decay handle sits on the attack's; a press on it
    // takes decay only.
    await page.evaluate(() => {
      const optionsPanel = window.__bd_probe.scene.OptionsPanel;
      for (const [param, value] of [
        ['attack', 0.01],
        ['decay', 0.01],
        ['sustain', 0.9],
      ] as const)
        (optionsPanel.SelectedBlock as V1BlockView).SetParam(param, value);
      optionsPanel.Refresh();
    });
    await page.waitForTimeout(100);
    const g4 = await geo();
    await page.mouse.move(g4.d[0], g4.d[1]);
    await page.mouse.down();
    const held = await page.evaluate(() =>
      (
        window.__bd_probe.scene.OptionsPanel.Options.find((x) => x.Type === 'ADSR')?.Handles ?? []
      ).map((handle) => handle.Selected),
    );
    await page.mouse.move(g4.d[0] + 30, g4.d[1], { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(100);
    const g5 = await geo();
    const overlap = {
      gap: Math.hypot(g4.a[0] - g4.d[0], g4.a[1] - g4.d[1]),
      held,
      attack: g5.attack,
      decay: g5.decay,
    };
    result.overlap = overlap;
    await page.close();
    const near = (a: number, b: number, rel: number) => Math.abs(a - b) <= Math.abs(b) * rel;
    const pass =
      near(g0.attack, 1, 1e-6) &&
      near(g1.attack, 1, 1e-6) &&
      near(tenth.attack, 0.01 * Math.pow(500, 0.1), 0.05) &&
      near(tenth.engine, tenth.attack, 1e-3) &&
      Math.abs(fine.moved - 4) < 0.6 &&
      fine.attack > tenth.attack &&
      fine.attack < 0.025 &&
      overlap.gap < 20 &&
      held.join() === 'false,true,false' &&
      near(overlap.attack, 0.01, 1e-6) &&
      overlap.decay > 0.02;
    return [pass, result];
  },
};
