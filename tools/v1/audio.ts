// bd v1 audio — deterministic audio references from BlokDust v1 itself (CHG-0002 1.1).
// v1 boots on an OfflineAudioContext (tools/v1/lib.ts bootV1 `offline`), loads a fixture composition, lets its timers
// (35 ms reconnect mute, etc.) run on the virtual clock, then renders: the output is v1's own Tone.js graph on Chromium's
// Web Audio, byte-identical run to run. References: tests/audio/reference/v1/<fixture>.wav (32-bit float; mono when both
// channels are identical) + manifest.json (sha256, sample rate, channels).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { writeWav, type Audio } from '../lib/wav.ts';
import { describe, spreadOf } from '../lib/audio-descriptors.ts';
import { V1_SHA, bootV1, loadComposition, randomPort, serve } from './lib.ts';

export const AUDIO_FIXTURES = 'tests/audio/fixtures/v1';
export const AUDIO_REFS = 'tests/audio/reference/v1';

/** `files`: v1 fetched its samples from files.blokdust.io (gone): serve `wav` for `url` to v1, and attach it to v1 block
 * `block` in v2 (CHG-0004 3.8). `stepped`: render in 10 ms steps, advancing v1's virtual clock between them, so v1's
 * timer-driven DSP (Granular's grain loop, Chomp) runs in step with the offline audio clock. */
export interface AudioFile { url: string; wav: string; block: number }
export interface AudioFixture { name: string; description?: string; seconds?: number; sampleRate?: number; runs?: number; composition: any;
  files?: AudioFile[]; stepped?: boolean }
export const thresholds = JSON.parse(readFileSync('tests/audio/thresholds.json', 'utf8'));

export function loadAudioFixtures(only?: string[]): AudioFixture[] {
  return readdirSync(AUDIO_FIXTURES).filter(f => f.endsWith('.json')).sort()
    .map(f => ({ name: basename(f, '.json'), ...JSON.parse(readFileSync(join(AUDIO_FIXTURES, f), 'utf8')) }))
    .filter(f => !only || only.includes(f.name));
}

export async function audio(args: string[]) {
  const { chromium } = await import('playwright');
  const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const out = opt('--out') ?? AUDIO_REFS;
  const fixtures = loadAudioFixtures(opt('--only')?.split(','));
  if (!fixtures.length) throw new Error(`no fixtures in ${AUDIO_FIXTURES}`);
  mkdirSync(out, { recursive: true });
  const port = randomPort();
  const server = await serve(port);
  const browser = await chromium.launch();
  const chromiumVersion = browser.version();  // the references are Chromium's Web Audio: record which build (AUDIO-0001)
  const results: any[] = [];
  const jobs = Math.max(1, Number(opt('--jobs') ?? 6));
  const queue = [...fixtures];
  // Diagnostics only (never for references): JS run in v1 before rendering, e.g. to bypass a node and measure a stage.
  const evalJs = opt('--eval');
  if (evalJs && out === AUDIO_REFS) throw new Error('--eval changes v1: write to a scratch --out, never the references');
  const renderOnce = async (fx: AudioFixture) => {
    const seconds = fx.seconds ?? 2, sampleRate = fx.sampleRate ?? 48000;
    const s = await bootV1(browser, port, { width: 1280, height: 800 }, 1, { seconds, sampleRate }, async page => {
      for (const f of fx.files ?? [])
        await page.route(f.url, r => r.fulfill({ status: 200, contentType: 'audio/wav', headers: { 'access-control-allow-origin': '*' }, body: readFileSync(f.wav) }));
    });
    try {
      const composition = { ZoomLevel: 1, DragOffset: { x: 0, y: 0 }, Version: '1.0.12', Parent: '', ColorThemeNo: 0, ...fx.composition };
      const blocks = await loadComposition(s, composition);
      // Let v1 settle: reconnect (35 ms timeouts), the master fade-in after a load (MainScene.Begin: -30 dB up in 2 dB
      // steps every 70 ms, ending at -12 dB, not the declared -10), and Play() at 2.4 s, which starts the simulation.
      await s.advance(3000);
      if (evalJs) await s.page.evaluate(js => (0, eval)(js), evalJs);
      if (fx.stepped) {
        // Suspend every 10 ms of audio; at each stop, run 10 ms of v1's timers, then resume (render quanta: 128 frames).
        const step = 10;
        await s.page.evaluate(({ seconds, step }) => {
          const ctx = (window as any).__bdOffline as OfflineAudioContext;
          (window as any).__bdAt = -1;
          for (let ms = step; ms < seconds * 1000 - step; ms += step) { const at = ms / 1000; ctx.suspend(at).then(() => { (window as any).__bdAt = at; }); }
          (window as any).__bdDone = ctx.startRendering().then(b => { (window as any).__bdBuf = b; });
        }, { seconds, step });
        for (let ms = step; ms < seconds * 1000 - step; ms += step) {
          const t = ms / 1000;
          // Wait (real time: the page's timers are virtual) for the render to reach this stop.
          const until = Date.now() + 20000;
          while ((await s.page.evaluate(() => (window as any).__bdAt)) < t - 1e-9) {
            if (Date.now() > until) throw new Error(`stepped render stuck before ${t.toFixed(3)} s`);
            await new Promise(r => setTimeout(r, 2));
          }
          await s.advance(step);
          // The fake context's resume() is a no-op (v1's start-up checks); resume the real offline render.
          await s.page.evaluate(() => OfflineAudioContext.prototype.resume.call((window as any).__bdOffline));
        }
        await s.page.evaluate(() => (window as any).__bdDone);
      }
      const r = await s.page.evaluate(async (stepped) => {
        const ctx = (window as any).__bdOffline as OfflineAudioContext;
        if ((window as any).App.Audio.ctx !== ctx) throw new Error('v1 is not using the offline context');
        const buf = stepped ? (window as any).__bdBuf as AudioBuffer : await ctx.startRendering();
        const enc = (a: Float32Array) => { const u = new Uint8Array(a.buffer.slice(0)); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
        return { sampleRate: buf.sampleRate, channels: [enc(buf.getChannelData(0)), enc(buf.getChannelData(1))] };
      }, !!fx.stepped);
      const ch = r.channels.map(b64 => { const b = Buffer.from(b64, 'base64'); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); });
      const mono = ch[0].every((v, i) => v === ch[1][i]);
      const audio: Audio = { sampleRate: r.sampleRate, channels: mono ? [ch[0]] : ch };
      const hash = createHash('sha256'); for (const c of audio.channels) hash.update(Buffer.from(c.buffer, c.byteOffset, c.byteLength));
      return { audio, blocks, composition, sha256: hash.digest('hex'), errors: s.errors };
    } finally { await s.close(); }
  };
  const one = async (fx: AudioFixture) => {
    // Every fixture renders at least twice: some v1 graphs are not deterministic in Chromium (e.g. Tone.Freeverb's
    // feedback loops of native nodes), and the parity check must know v1's own spread rather than chase one take.
    const runs = Math.max(2, fx.runs ?? 2);
    const takes = [];
    for (let i = 0; i < runs; i++) takes.push(await renderOnce(fx));
    const first = takes[0];
    const wav = join(out, `${fx.name}.wav`);
    writeWav(wav, first.audio);
    const descriptors = takes.map(t => describe(t.audio));
    const deterministic = takes.every(t => t.sha256 === first.sha256);
    const res = { name: fx.name, wav, sampleRate: first.audio.sampleRate, seconds: fx.seconds ?? 2, channels: first.audio.channels.length,
      blocks: first.blocks, composition: first.composition, ...(fx.files ? { files: fx.files } : {}), ...(fx.stepped ? { stepped: true } : {}), runs, deterministic, sha256: first.sha256,
      ...(deterministic ? {} : { takes: takes.map(t => t.sha256), spread: spreadOf(descriptors, thresholds.default) }),
      descriptors: descriptors[0], errors: [...new Set(takes.flatMap(t => t.errors))] };
    results.push(res);
    console.error(`rendered ${wav} (${first.blocks} blocks, ${runs} runs, ${deterministic ? 'deterministic' : 'NOT deterministic in v1'}, rms ${res.descriptors.rmsDb} dB${res.errors.length ? `, page errors: ${res.errors.join('; ')}` : ''})`);
  };
  try {
    await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => { for (let fx; (fx = queue.shift());) await one(fx); }));
  } finally { await browser.close(); server.close(); }
  // A partial capture (--only) merges into the manifest: the other fixtures keep their entries.
  const manifestPath = join(out, 'manifest.json');
  const prev: any[] = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')).results ?? [] : [];
  const merged = [...prev.filter(p => !results.some(r => r.name === p.name)), ...results].sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(manifestPath, JSON.stringify({ v1Sha: V1_SHA, chromium: chromiumVersion, results: merged }, null, 2) + '\n');
  console.log(JSON.stringify({ out, rendered: results.length, nondeterministic: results.filter(r => !r.deterministic).map(r => r.name),
    silent: results.filter(r => r.descriptors.rmsDb <= -90).map(r => r.name), withErrors: results.filter(r => r.errors.length).length }));
}
