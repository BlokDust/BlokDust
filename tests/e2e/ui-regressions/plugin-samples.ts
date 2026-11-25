// ui-regressions: Samples in the plugins: loading, the convolver and the recorder.
import { OUT, browser, maxChange, state, toCss, type RegressionTest, url } from './harness.ts';
import { openPlugin, plugPatch } from './pluginPage.ts';
import { waveBox } from './samplerPanel.ts';
import type { V1BlockView } from './v1Views.ts';

/** What a test reads from a message the page sent the processor. */
type SentValue = Partial<Record<'id' | 'token', number>> & { on?: boolean; ref?: { id?: number } };

export const pluginSamplesTests: Record<string, RegressionTest> = {
  /** CHG-0004: the processor owns samples; the page shows its reports; drops go to the sampler
   * under the pointer or a new Sample; YOUR FILE and Freesound picks go to the processor. */
  async 'plugin-samples'(errors: string[]) {
    const patch = {
      format: 'blokdust.patch',
      version: 2,
      seed: 1,
      blocks: [{ id: 's', type: 'source.sample', x: 0, y: 0, params: {} }],
    };
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript((processorPatch) => {
      const listeners: Partial<Record<string, ((value: unknown) => void)[]>> = {};
      const sent: { id: string; v: unknown }[] = [];
      window.__sent = sent;
      window.__fire = (id: string, value: unknown) => {
        listeners[id]?.forEach((listener) => {
          listener(value);
        });
      };
      window.__JUCE__ = {
        backend: {
          addEventListener: (id: string, listener: (value: unknown) => void) => {
            (listeners[id] ??= []).push(listener);
          },
          emitEvent: (id: string, value: unknown) => {
            sent.push({ id, v: value });
            if (id === 'bd_hello')
              setTimeout(() => {
                listeners.bd_patch?.forEach((listener) => {
                  listener({ patch: JSON.stringify(processorPatch) });
                });
              }, 50);
          },
        },
      };
    }, patch);
    const pg = await context.newPage();
    pg.on('pageerror', (error) => errors.push(error.message));
    await pg.goto(`${url}/index.html`);
    await pg.waitForFunction(() => (window as Partial<Window>).__bd_probe?.state.started, null, {
      timeout: 15000,
    });
    await pg.waitForTimeout(800);
    const sentIds = () => pg.evaluate(() => (window.__sent ?? []).map((message) => message.id));
    const hello = (await sentIds()).includes('bd_samplesHello');
    const id = (await state(pg)).blocks[0].id;
    await pg.evaluate((i) => {
      window.__fire?.('bd_sampleInfo', { id: i, loading: true, missing: false });
    }, id);
    const spinning = await pg.evaluate(
      () => window.__bd_probe.scene.AnimationsLayer.ActiveBlocks.length,
    );
    const preview = Array.from({ length: 2000 }, (_, i) => Math.sin(i / 7) * Math.exp(-i / 800));
    await pg.evaluate(
      ([i, pv]) => {
        window.__fire?.('bd_sampleInfo', {
          id: i,
          loading: false,
          missing: false,
          duration: 2,
          sampleRate: 44100,
          preview: pv,
          track: 'file:kick.wav',
          ref: { provider: 'file', name: 'kick.wav', path: '/Users/me/kick.wav' },
          params: {
            track: 'file:kick.wav',
            trackName: 'kick.wav',
            user: 'Local file',
            startPosition: 0,
            endPosition: 2,
            loopStart: 1,
            loopEnd: 2,
          },
        });
      },
      [id, preview] as const,
    );
    const shown = await pg.evaluate(() => {
      const probe = window.__bd_probe;
      const v1Block = probe.v1App.Blocks[0] as V1BlockView;
      return {
        spin: probe.scene.AnimationsLayer.ActiveBlocks.length,
        wave: v1Block.WaveForm.length,
        name: v1Block.Params.trackName,
        end: v1Block.Params.endPosition,
        patchTrack: probe.state.patch.blocks[0].params?.track,
        ref: (probe.state.patch.refs?.['file:kick.wav'] as { path?: string } | undefined)?.path,
      };
    });
    // Drop on the Sample, then on empty stage.
    const samplePoint = await pg.evaluate((i) => window.__bd_probe.blockPoint(i), id);
    if (!samplePoint) throw new Error('the Sample is not on screen');
    await pg.evaluate(
      ([x, y]) => {
        window.__fire?.('bd_dropAt', { x, y, token: 1 });
      },
      [samplePoint[0], samplePoint[1]] as const,
    );
    await pg.evaluate(() => {
      window.__fire?.('bd_dropAt', { x: 1000, y: 650, token: 2 });
    });
    await pg.waitForTimeout(200);
    const drops = await pg.evaluate(() =>
      (window.__sent ?? [])
        .filter((message) => message.id === 'bd_dropTarget')
        .map((message) => message.v as SentValue),
    );
    const blocksAfter = (await state(pg)).blocks.length;
    // YOUR FILE and a Freesound pick go to the processor.
    await pg.evaluate((i) => {
      const scene = window.__bd_probe.scene;
      scene.host.loadSample(i);
      scene.host.loadFreesound(
        i,
        {
          id: 9,
          name: 'Bell',
          username: 'u',
          license: 'CC0',
          licenseUrl: '',
          duration: 1,
          preview: 'https://cdn.freesound.org/x.mp3',
          url: 'https://freesound.org/s/9/',
        },
        { trackName: 'BELL', user: 'U', permalink: '' },
      );
    }, id);
    const last = await pg.evaluate(() =>
      (window.__sent ?? []).slice(-2).map((message) => ({
        id: message.id,
        v: message.v as SentValue,
      })),
    );
    await pg.screenshot({ path: `${OUT}/plugin-samples.png` });
    await context.close();
    const ok =
      hello &&
      spinning === 1 &&
      shown.spin === 0 &&
      shown.wave > 0 &&
      shown.name === 'kick.wav' &&
      shown.end === 2 &&
      shown.patchTrack === 'file:kick.wav' &&
      shown.ref === '/Users/me/kick.wav' &&
      drops[0]?.token === 1 &&
      drops[0]?.id === id &&
      drops[1]?.token === 2 &&
      drops[1]?.id !== id &&
      blocksAfter === 2 &&
      last[0]?.id === 'bd_pickFile' &&
      last[0]?.v.id === id &&
      last[1]?.id === 'bd_loadUrl' &&
      last[1]?.v.ref?.id === 9;
    return [ok, { hello, spinning, shown, drops, blocksAfter, last: last.map((x) => x.id) }];
  },
  /** Plugin: the Convolver's panel waveform shows the spinning square while the processor loads. */
  async 'plugin-convolver-spinner'(errors: string[]) {
    const { pg, close } = await openPlugin(
      plugPatch([{ id: 'c', type: 'fx.convolver', x: 0, y: 0 }]),
      errors,
    );
    const id = (await state(pg)).blocks[0].id;
    const preview = Array.from({ length: 2000 }, (_, i) => Math.sin(i / 5) * Math.exp(-i / 500));
    await pg.evaluate(
      ([i, pv]) => {
        window.__fire?.('bd_sampleInfo', {
          id: i,
          loading: false,
          missing: false,
          duration: 2,
          preview: pv,
          track: 'freesound:1',
        });
      },
      [id, preview] as const,
    );
    const point = await pg.evaluate((i) => window.__bd_probe.blockPoint(i), id);
    if (!point) throw new Error('the Convolver is not on screen');
    await pg.mouse.click(point[0], point[1]);
    await pg.waitForTimeout(1200);
    await pg.evaluate((i) => {
      window.__fire?.('bd_sampleInfo', { id: i, loading: true, missing: false });
    }, id);
    await pg.waitForTimeout(200);
    const change = await maxChange(pg, await waveBox(pg), 300);
    await pg.screenshot({ path: `${OUT}/plugin-convolver-spinner.png` });
    await close();
    return [change > 40, { panelPixelChangeIn300ms: change }];
  },
  /** Plugin: the Recorder records in the processor; SampleGen's sound goes to the processor as a
   * file, and a SampleGen whose sound is already a file is not generated again. */
  async 'plugin-recorder-samplegen'(errors: string[]) {
    const { pg, close } = await openPlugin(
      plugPatch([
        { id: 'r', type: 'source.recorder', x: 6, y: 4 },
        { id: 'g', type: 'source.sample-gen', x: -6, y: 0 },
        {
          id: 'h',
          type: 'source.sample-gen',
          x: -6,
          y: 6,
          params: { track: 'file:BlokDust SampleGen.wav' },
        },
      ]),
      errors,
    );
    await pg.waitForTimeout(500);
    const ids = (await state(pg)).blocks.map((b) => b.id);
    const [bx, by] = await toCss(pg, 6, 4),
      [, gy1] = await toCss(pg, 6, 5),
      grid = gy1 - by;
    await pg.mouse.click(bx, by - 3 * grid);
    await pg.waitForTimeout(600);
    await pg.mouse.click(bx, by - 3 * grid);
    await pg.waitForTimeout(300);
    const sent = await pg.evaluate(() =>
      (window.__sent ?? []).map((message) => {
        if (message.id !== 'bd_sampleData') return { id: message.id, v: message.v as SentValue };
        const data = message.v as { id: number; data: ArrayLike<number>; sampleRate: number };
        return { id: message.id, v: { id: data.id, n: data.data.length, sr: data.sampleRate } };
      }),
    );
    await close();
    const rec = sent.filter((x) => x.id === 'bd_record').map((x) => x.v as SentValue);
    const gen = sent
      .filter((x) => x.id === 'bd_sampleData')
      .map((x) => x.v as { id: number; n: number; sr: number });
    const ok =
      rec.length === 2 &&
      rec[0].on === true &&
      rec[1].on === false &&
      rec[0].id === ids[0] &&
      gen.length === 1 &&
      gen[0].id === ids[1] &&
      gen[0].n > 1000 &&
      gen[0].sr > 8000;
    return [ok, { record: rec, generated: gen }];
  },
};
