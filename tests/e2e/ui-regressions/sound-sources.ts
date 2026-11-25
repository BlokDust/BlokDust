// ui-regressions: Generated and downloaded sounds: SampleGen, Granular, the convolver, Freesound, envelopes.
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

export const soundSourcesTests: Record<string, RegressionTest> = {
  /** SampleGen generates its sound (v1's own generator) and plays it while held; the recipe is saved in the patch. */
  async 'samplegen-plays'(errors) {
    const page = await open(browser, [blk(1, 'SampleGen', 0, 0)], errors);
    const [x, y] = await toCss(page, 0, 0.5);
    await page.mouse.move(x, y);
    await page.mouse.down();
    const held = await maxOver(page, 'rms', 1000);
    await page.mouse.up();
    const seed = (await state(page)).patch.blocks[0].params.seed;
    await page.close();
    return [
      held > 0.002 && Array.isArray(seed?.waveVoices) && seed.waveVoices.length > 0,
      { holdingSampleGen: held, savedVoices: seed?.waveVoices?.length },
    ];
  },
  /** Granular with a loaded file plays grains while held (KNOWN from Phase 1 until the grain engine, CHG-0004 3.8). */
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
  /** 6. The Convolver only uses the first 2.5 s of an impulse response (engine kMaxImpulseSeconds), so it downloads
   * only the start of a Freesound preview (an HTTP Range request), not the whole file. Audio goes to the browser only. */
  async 'convolver-downloads-only-what-it-uses'(errors: string[]) {
    cdn.seconds = 1;
    cdn.requests = [];
    const page = await open(browser, [blk(1, 'Convolver', 0, 0)], errors);
    const id = (await state(page)).blocks[0].id;
    await page.evaluate(
      (i) =>
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
        ),
      id,
    );
    await page
      .waitForFunction(
        () =>
          window.__bd_probe.samples.some(
            (x) => x.loaded && x.track === 'freesound:42',
          ),
        null,
        { timeout: 10000 },
      )
      .catch(() => {});
    await page.close();
    const req = cdn.requests.find((request) => request.url.includes('/42_'));
    const end = Number(req?.range?.match(/^bytes=0-(\d+)$/)?.[1] ?? NaN);
    return [Number.isFinite(end) && end < 200_000, { range: req?.range ?? 'none (whole file)' }];
  },
  // Owner (2026-11-14): the Freesound results show each sound's length after its author ("By User · 1:05").
  async 'freesound-results-show-length'(errors: string[]) {
    const page = await open(browser, [blk(1, 'Sample', 0, 0)], errors);
    const [x, y] = await toCss(page, 0, 0);
    await page.mouse.click(x + 8, y + 8);
    await page.waitForTimeout(1000); // the block: its options panel
    await page.evaluate(() => {
      const scene = window.__bd_probe.scene,
        seen: string[] = (window.__texts = []);
      const drawText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text: string, ...a: any[]) {
        seen.push(text);
        return (drawText as any).call(this, text, ...a);
      };
      const sound = (id: number, name: string, username: string, duration: number) => ({
        provider: 'freesound',
        id,
        name,
        username,
        duration,
        license: 'CC0',
        licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/',
        preview: `https://cdn.freesound.org/previews/${id}.mp3`,
        url: `https://freesound.org/s/${id}/`,
      });
      scene.host.searchSamples = () =>
        Promise.resolve([sound(1, 'Short hit', 'alice', 0.4), sound(2, 'Long pad', 'bob', 65.2)]);
      scene.OptionsPanel.SelectedBlock.SearchString = 'pad';
      scene.SoundcloudPanel.OpenPanel();
      scene.SoundcloudPanel.Submit();
    });
    await page.waitForTimeout(1500);
    const result = await page.evaluate(() => ({
      open: window.__bd_probe.scene.SoundcloudPanel.Open,
      texts: [...new Set((window.__texts as string[]).filter((t) => t.startsWith('By ')))],
    }));
    await page.screenshot({ path: `${OUT}/freesound-results-show-length.png` });
    await page.close();
    return [result.open && result.texts.includes('By Alice · 0:01') && result.texts.includes('By Bob · 1:05'), result];
  },
  // Owner (2026-11-17, CHG-0035): SampleGen's GENERATE WAVE rolled a new random wave; a SOUND slider picks one by
  // number instead, and a number is always the same wave.
  async 'sample-gen-sound-slider'(errors: string[]) {
    const page = await open(browser, [blk(1, 'SampleGen', 0, 0)], errors);
    const [x, y] = await toCss(page, 0, 0);
    await page.mouse.click(x + 8, y + 8);
    await page.waitForTimeout(1200);
    const form = await page.evaluate(() =>
      (window.__bd_probe.scene.OptionsPanel.Options as any[]).map((o) => o.Setting),
    );
    const now = () =>
      page.evaluate(() => {
        const b = window.__bd_probe.scene.OptionsPanel.SelectedBlock;
        return { wave: (b.WaveForm as number[]).join(), sound: b.Params.sound as number };
      });
    const wave = async (n: number) => {
      // a number set and let go (as a release does)
      await page.evaluate((k) => {
        const scene = window.__bd_probe.scene,
          b = scene.OptionsPanel.SelectedBlock;
        b.SetParam('sound', k);
        scene.host.setSound(b.Id, k, true);
      }, n);
      await page.waitForFunction(
        (k) => {
          const b = window.__bd_probe.scene.OptionsPanel.SelectedBlock;
          return b.Params.sound === k && b.WaveForm.length > 0;
        },
        n,
        { timeout: 10000 },
      );
      await page.waitForTimeout(300);
      return page.evaluate(() => {
        const b = window.__bd_probe.scene.OptionsPanel.SelectedBlock;
        return {
          wave: (b.WaveForm as number[]).join(),
          sound: window.__bd_probe.state.patch.blocks[0].params.sound,
        };
      });
    };
    const a = await wave(5),
      b2 = await wave(6),
      a2 = await wave(5);
    // Owner (2026-11-17): the wave is made on release, not while dragging; the number stays on show.
    const row = await page.evaluate(() => {
      const optionsPanel = window.__bd_probe.scene.OptionsPanel,
        pr = window.__bd_probe.v1App.Metrics.PixelRatio,
        q = (optionsPanel.Options as any[]).find((x) => x.Setting === 'sound');
      return {
        x0: (optionsPanel.Position.x + optionsPanel.Margin) / pr,
        w: optionsPanel.Range / pr,
        y: (optionsPanel.Position.y + q.Position.y + q.Size.height / 2) / pr,
        handle: (optionsPanel.Position.x + optionsPanel.Margin + q.Position.x) / pr,
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
        (w) => {
          const b = window.__bd_probe.scene.OptionsPanel.SelectedBlock;
          return b.WaveForm.length > 0 && (b.WaveForm as number[]).join() !== w;
        },
        before.wave,
        { timeout: 10000 },
      )
      .catch(() => {});
    await page.waitForTimeout(500);
    const after = await now();
    await page.evaluate(() => {
      const seen: string[] = (window.__texts = []),
        drawText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text: string, ...q: any[]) {
        seen.push(text);
        return (drawText as any).call(this, text, ...q);
      };
      window.__bd_probe.scene.OptionsPanel.SelectedBlock.RefreshOptionsPanel();
    });
    await page.mouse.move(row.x0 - 200, row.y + 200);
    await page.waitForTimeout(600);
    const shown = await page.evaluate(
      (n) => (window.__texts as string[]).includes(`#${n}`),
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
  // Owner (2026-11-17): short attacks were hard to set on the Envelope's graph (v1's straight 10 ms – 5 s axis put
  // everything under 100 ms in 2 px). The time handles now sit on a log axis, follow the pointer from where they are
  // grabbed, move a tenth as fast with Shift, and a press where handles overlap takes the nearest one (adsrPanel.ts).
  async 'envelope-short-attack'(errors: string[]) {
    const page = await open(browser, [blk(1, 'Envelope', 0, 0)], errors);
    const [bx, by] = await toCss(page, 0, 0.5);
    await page.mouse.click(bx, by);
    await page.waitForTimeout(1200);
    const geo = () =>
      page.evaluate(() => {
        const probe = window.__bd_probe,
          optionsPanel = probe.scene.OptionsPanel,
          e = (optionsPanel.Options as any[]).find((x) => x.Type === 'ADSR'),
          handles = e.Handles;
        const x0 = optionsPanel.Position.x + optionsPanel.Margin,
          y0 = optionsPanel.Position.y + e.Position.y,
          ht = e.Size.height;
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
          engine: probe.state.patch.blocks.find((b) => b.type === 'fx.envelope').params,
        };
      });
    const result: Record<string, any> = {};
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
    // 2. dragged to a tenth of its track: ~19 ms on the log axis (v1's straight axis: 0.5 s)
    await page.mouse.move(g1.a[0], g1.a[1]);
    await page.mouse.down();
    const track0 = g1.a[0] - (g1.range * Math.log(100)) / Math.log(500); // attack 1 s sits at ln(100)/ln(500) of the track
    await page.mouse.move(track0 + g1.range * 0.1, g1.a[1], { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const g2 = await geo();
    result.tenth = { attack: g2.attack, engine: g2.engine.attack };
    // 3. with Shift, 40 px of pointer is 4 px of handle
    await page.mouse.move(g2.a[0], g2.a[1]);
    await page.mouse.down();
    await page.keyboard.down('Shift');
    await page.mouse.move(g2.a[0] + 40, g2.a[1], { steps: 8 });
    await page.keyboard.up('Shift');
    await page.mouse.up();
    await page.waitForTimeout(100);
    const g3 = await geo();
    result.fine = { moved: g3.a[0] - g2.a[0], attack: g3.attack };
    await page.screenshot({ path: `${OUT}/envelope-short-attack.png` });
    // 4. attack and decay short, sustain high: the decay handle sits on the attack's; a press on it takes decay only
    await page.evaluate(() => {
      const optionsPanel = window.__bd_probe.scene.OptionsPanel;
      for (const [k, value] of [
        ['attack', 0.01],
        ['decay', 0.01],
        ['sustain', 0.9],
      ])
        optionsPanel.SelectedBlock.SetParam(k, value);
      optionsPanel.Refresh();
    });
    await page.waitForTimeout(100);
    const g4 = await geo();
    await page.mouse.move(g4.d[0], g4.d[1]);
    await page.mouse.down();
    const held = await page.evaluate(() =>
      (window.__bd_probe.scene.OptionsPanel.Options as any[])
        .find((x) => x.Type === 'ADSR')
        .Handles.map((Handle) => Handle.Selected),
    );
    await page.mouse.move(g4.d[0] + 30, g4.d[1], { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(100);
    const g5 = await geo();
    result.overlap = {
      gap: Math.hypot(g4.a[0] - g4.d[0], g4.a[1] - g4.d[1]),
      held,
      attack: g5.attack,
      decay: g5.decay,
    };
    await page.close();
    const near = (a: number, b: number, rel: number) => Math.abs(a - b) <= Math.abs(b) * rel;
    const pass =
      near(g0.attack, 1, 1e-6) &&
      near(result.press, 1, 1e-6) &&
      near(result.tenth.attack, 0.01 * Math.pow(500, 0.1), 0.05) &&
      near(result.tenth.engine, result.tenth.attack, 1e-3) &&
      Math.abs(result.fine.moved - 4) < 0.6 &&
      result.fine.attack > result.tenth.attack &&
      result.fine.attack < 0.025 &&
      result.overlap.gap < 20 &&
      held.join() === 'false,true,false' &&
      near(result.overlap.attack, 0.01, 1e-6) &&
      result.overlap.decay > 0.02;
    return [pass, result];
  },
};
