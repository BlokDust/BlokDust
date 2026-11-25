// bd v1 audio (CHG-0002 1.1): v1's own Tone.js renders each fixture on an OfflineAudioContext, its
// timers on the virtual clock; writes <fixture>.wav (float32, mono if equal) + manifest.json.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { writeWav, type Audio } from '../lib/wav.ts';
import {
  describe,
  spreadOf,
  type Descriptors,
  type Thresholds,
  type ThresholdsFile,
} from '../lib/audio-descriptors.ts';
import { V1_SHA, bootV1, loadComposition, randomPort, serve, type V1Session } from './lib.ts';

export const AUDIO_FIXTURES = 'tests/audio/fixtures/v1';
export const AUDIO_REFS = 'tests/audio/reference/v1';

/** A sample v1 fetched from files.blokdust.io (gone): v1 gets `wav` at `url`, v2 at `block`. */
export interface AudioFile {
  url: string;
  wav: string;
  block: number;
}
export interface AudioFixture {
  name: string;
  description?: string;
  seconds?: number;
  sampleRate?: number;
  runs?: number;
  composition: Record<string, unknown>;
  files?: AudioFile[]; // CHG-0004 3.8
  /** Render in 10 ms steps with v1's virtual clock between them, so timer-driven DSP keeps step. */
  stepped?: boolean;
}

/** One fixture's entry in the references' manifest.json. */
export interface V1AudioReference {
  name: string;
  wav: string;
  sampleRate: number;
  seconds: number;
  channels: number;
  blocks: number;
  composition: Record<string, unknown>;
  files?: AudioFile[];
  stepped?: true;
  runs: number;
  deterministic: boolean;
  sha256: string;
  takes?: string[];
  spread?: Partial<Record<keyof Thresholds, number>>;
  descriptors: Descriptors;
  errors: string[];
}

export const thresholds = JSON.parse(
  readFileSync('tests/audio/thresholds.json', 'utf8'),
) as ThresholdsFile;

export function loadAudioFixtures(only?: string[]): AudioFixture[] {
  return readdirSync(AUDIO_FIXTURES)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => ({
      name: basename(file, '.json'),
      ...(JSON.parse(readFileSync(join(AUDIO_FIXTURES, file), 'utf8')) as Omit<AudioFixture, 'name'>),
    }))
    .filter((fixture) => !only || only.includes(fixture.name));
}

const nameOf = (reference: V1AudioReference) => reference.name;

/** Suspend every 10 ms of audio; at each stop run 10 ms of v1's timers, then resume. */
async function renderStepped(session: V1Session, seconds: number) {
  const step = 10;
  await session.page.evaluate(
    ({ seconds, step }) => {
      const offline = window.__bdOffline;
      if (!offline) throw new Error('v1 has no offline context');
      window.__bdAt = -1;
      for (let ms = step; ms < seconds * 1000 - step; ms += step) {
        const at = ms / 1000;
        void offline.suspend(at).then(() => {
          window.__bdAt = at;
        });
      }
      window.__bdDone = offline.startRendering().then((buffer) => {
        window.__bdBuf = buffer;
      });
    },
    { seconds, step },
  );
  for (let ms = step; ms < seconds * 1000 - step; ms += step) {
    const stop = ms / 1000;
    // Wait (real time: the page's timers are virtual) for the render to reach this stop.
    const until = Date.now() + 20000;
    while ((await session.page.evaluate(() => window.__bdAt ?? -1)) < stop - 1e-9) {
      if (Date.now() > until) throw new Error(`stepped render stuck before ${stop.toFixed(3)} s`);
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    await session.advance(step);
    // The fake context's resume() is a no-op (v1's start-up checks); resume the real render.
    await session.page.evaluate(() =>
      OfflineAudioContext.prototype.resume.call(window.__bdOffline),
    );
  }
  await session.page.evaluate(() => window.__bdDone);
}

export async function audio(args: string[]) {
  const { chromium } = await import('playwright');
  const opt = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const out = opt('--out') ?? AUDIO_REFS;
  const fixtures = loadAudioFixtures(opt('--only')?.split(','));
  if (!fixtures.length) throw new Error(`no fixtures in ${AUDIO_FIXTURES}`);
  mkdirSync(out, { recursive: true });
  const port = randomPort();
  const server = await serve(port);
  const browser = await chromium.launch();
  // The references are Chromium's Web Audio: record which build (AUDIO-0001).
  const chromiumVersion = browser.version();
  const results: V1AudioReference[] = [];
  const jobs = Math.max(1, Number(opt('--jobs') ?? 6));
  const queue = [...fixtures];
  // Diagnostics only (never references): JS run in v1 before rendering, e.g. to bypass a node.
  const evalJs = opt('--eval');
  if (evalJs && out === AUDIO_REFS)
    throw new Error('--eval changes v1: write to a scratch --out, never the references');
  const renderOnce = async (fx: AudioFixture) => {
    const seconds = fx.seconds ?? 2,
      sampleRate = fx.sampleRate ?? 48000;
    const session = await bootV1(
      browser,
      port,
      { width: 1280, height: 800 },
      1,
      { seconds, sampleRate },
      async (page) => {
        for (const audioFile of fx.files ?? [])
          await page.route(audioFile.url, (route) =>
            route.fulfill({
              status: 200,
              contentType: 'audio/wav',
              headers: { 'access-control-allow-origin': '*' },
              body: readFileSync(audioFile.wav),
            }),
          );
      },
    );
    try {
      const composition = {
        ZoomLevel: 1,
        DragOffset: { x: 0, y: 0 },
        Version: '1.0.12',
        Parent: '',
        ColorThemeNo: 0,
        ...fx.composition,
      };
      const blocks = await loadComposition(session, composition);
      // Let v1 settle: reconnects (35 ms), the master fade-in after a load (MainScene.Begin: -30 dB
      // up 2 dB per 70 ms, ending at -12 dB, not the declared -10), and Play() at 2.4 s.
      await session.advance(3000);
      if (evalJs) await session.page.evaluate((js) => (0, eval)(js) as unknown, evalJs);
      if (fx.stepped) await renderStepped(session, seconds);
      const rendered = await session.page.evaluate(async (stepped) => {
        const offline = window.__bdOffline;
        if (!offline || window.App?.Audio.ctx !== offline)
          throw new Error('v1 is not using the offline context');
        const buffer = stepped ? window.__bdBuf : await offline.startRendering();
        if (!buffer) throw new Error('stepped render has no buffer');
        const toBase64 = (samples: Float32Array) => {
          const bytes = new Uint8Array(samples.buffer.slice(0));
          let binary = '';
          for (let i = 0; i < bytes.length; i += 0x8000)
            binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          return btoa(binary);
        };
        return {
          sampleRate: buffer.sampleRate,
          channels: [toBase64(buffer.getChannelData(0)), toBase64(buffer.getChannelData(1))],
        };
      }, !!fx.stepped);
      const channels = rendered.channels.map((base64) => {
        const bytes = Buffer.from(base64, 'base64');
        return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4);
      });
      const mono = channels[0].every((sample, i) => sample === channels[1][i]);
      const audio: Audio = {
        sampleRate: rendered.sampleRate,
        channels: mono ? [channels[0]] : channels,
      };
      const hash = createHash('sha256');
      for (const samples of audio.channels)
        hash.update(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength));
      return { audio, blocks, composition, sha256: hash.digest('hex'), errors: session.errors };
    } finally {
      await session.close();
    }
  };
  const one = async (fx: AudioFixture) => {
    // At least two takes: some v1 graphs vary in Chromium (Tone.Freeverb's native feedback loops),
    // and the parity check needs v1's own spread rather than one take.
    const runs = Math.max(2, fx.runs ?? 2);
    const takes = [];
    for (let i = 0; i < runs; i++) takes.push(await renderOnce(fx));
    const first = takes[0];
    const wav = join(out, `${fx.name}.wav`);
    writeWav(wav, first.audio);
    const descriptors = takes.map((take) => describe(take.audio));
    const deterministic = takes.every((take) => take.sha256 === first.sha256);
    const res: V1AudioReference = {
      name: fx.name,
      wav,
      sampleRate: first.audio.sampleRate,
      seconds: fx.seconds ?? 2,
      channels: first.audio.channels.length,
      blocks: first.blocks,
      composition: first.composition,
      ...(fx.files ? { files: fx.files } : {}),
      ...(fx.stepped ? { stepped: true } : {}),
      runs,
      deterministic,
      sha256: first.sha256,
      ...(deterministic
        ? {}
        : {
            takes: takes.map((take) => take.sha256),
            spread: spreadOf(descriptors, thresholds.default),
          }),
      descriptors: descriptors[0],
      errors: [...new Set(takes.flatMap((take) => take.errors))],
    };
    results.push(res);
    const determinism = deterministic ? 'deterministic' : 'NOT deterministic in v1';
    const errorNote = res.errors.length ? `, page errors: ${res.errors.join('; ')}` : '';
    console.error(
      `rendered ${wav} (${first.blocks} blocks, ${runs} runs, ${determinism}, rms ${res.descriptors.rmsDb} dB${errorNote})`,
    );
  };
  try {
    await Promise.all(
      Array.from({ length: Math.min(jobs, queue.length) }, async () => {
        for (let fx; (fx = queue.shift()); ) await one(fx);
      }),
    );
  } finally {
    await browser.close();
    server.close();
  }
  // A partial capture (--only) merges into the manifest: the other fixtures keep their entries.
  const manifestPath = join(out, 'manifest.json');
  const prev = existsSync(manifestPath)
    ? ((JSON.parse(readFileSync(manifestPath, 'utf8')) as { results?: V1AudioReference[] })
        .results ?? [])
    : [];
  const merged = [
    ...prev.filter((old) => !results.some((result) => result.name === old.name)),
    ...results,
  ].sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(
    manifestPath,
    JSON.stringify({ v1Sha: V1_SHA, chromium: chromiumVersion, results: merged }, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({
      out,
      rendered: results.length,
      nondeterministic: results.filter((result) => !result.deterministic).map(nameOf),
      silent: results.filter((result) => result.descriptors.rmsDb <= -90).map(nameOf),
      withErrors: results.filter((result) => result.errors.length).length,
    }),
  );
}
