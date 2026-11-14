// Shared helpers for driving BlokDust v1 headlessly and deterministically.
import { spawnSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import type { Browser, Page } from 'playwright';

export const V1_REPO = 'https://github.com/BlokDust/BlokDust.git';
export const V1_SHA = 'c427998a3f88bb11cb8cb9c8061b2d6723fee67e';
export const V1_DIR = '.cache/v1';
const DIST = join(V1_DIR, 'dist');

// Every v1 block type as BlockCreator names it, grouped by v1 menu category.
export const V1_BLOCKS: Record<string, string[]> = {
  source: ['ToneSource', 'Noise', 'Microphone', 'Sample', 'Granular', 'Recorder', 'SampleGen'],
  effect: ['AutoWah', 'BitCrusher', 'Chomp', 'Chopper', 'Chorus', 'Convolver', 'StereoDelay', 'Distortion',
    'Envelope', 'EQ', 'Filter', 'Vibrato', 'Phaser', 'PitchShifter', 'Reverb', 'Scuzz', 'Volume'],
  power: ['ParticleEmitter', 'Power', 'Toggle', 'Void', 'Pulse', 'Laser'],
  interaction: ['ComputerKeyboard', 'MIDIController'],
};

const sh = (cmd: string, args: string[]) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed`);
};

export function fetchV1() {
  if (existsSync(join(DIST, 'index.html'))) { console.error(`v1 already at ${V1_DIR}`); return; }
  mkdirSync(V1_DIR, { recursive: true });
  sh('git', ['-C', V1_DIR, 'init', '-q']);
  sh('git', ['-C', V1_DIR, 'fetch', '-q', '--depth', '1', V1_REPO, V1_SHA]);
  sh('git', ['-C', V1_DIR, 'checkout', '-q', 'FETCH_HEAD']);
}

const MIME: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.gif': 'image/gif', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.woff': 'font/woff', '.woff2': 'font/woff2' };

export function serve(port: number): Promise<Server> {
  if (!existsSync(join(DIST, 'index.html'))) throw new Error('v1 not fetched: run `pnpm bd v1 fetch`');
  const server = createServer((req, res) => {
    let p = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    if (p.endsWith('/')) p += 'index.html';
    const f = join(DIST, p);
    if (!existsSync(f)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' }).end(readFileSync(f));
  });
  return new Promise(r => server.listen(port, () => r(server)));
}

export const randomPort = () => 8731 + Math.floor(Math.random() * 1000);

export interface V1Session { page: Page; errors: string[]; advance: (ms: number) => Promise<void>; close: () => Promise<void> }

/** Boot v1 on virtual time with seeded randomness, tutorial suppressed and the loading splash finished. */
export interface OfflineAudio { seconds: number; sampleRate: number }

export async function bootV1(browser: Browser, port: number, viewport: { width: number; height: number }, dpr = 1, offline?: OfflineAudio,
  prepare?: (page: Page) => Promise<void>): Promise<V1Session> {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  if (offline) {
    // Audio references (CHG-0002 1.1): Tone.js creates its context with `new AudioContext` when v1's bundle loads.
    // Hand it an OfflineAudioContext instead, so v1's own DSP (Tone.js on Chromium's Web Audio) renders
    // deterministically, as fast as possible, when the tool calls startRendering(). It reports "running" so v1's
    // start-up checks (hasAudioContextStarted) pass before rendering begins.
    await page.addInitScript(({ seconds, sampleRate }) => {
      const Offline = window.OfflineAudioContext;
      function FakeAudioContext() {
        const c = new Offline(2, Math.round(seconds * sampleRate), sampleRate);
        Object.defineProperty(c, 'state', { get: () => 'running' });
        (c as any).resume = () => Promise.resolve();
        (window as any).__bdOffline = c;
        return c;
      }
      FakeAudioContext.prototype = Offline.prototype;
      (window as any).AudioContext = FakeAudioContext;
      (window as any).webkitAudioContext = FakeAudioContext;
    }, offline);
  }
  // v1 loads its fonts from files.blokdust.io, a domain this project no longer controls. Serve the vendored copies
  // (web/public/fonts, identical bytes, OFL) so references never depend on it.
  await page.route('https://files.blokdust.io/fonts/**', route => {
    const name = route.request().url().split('/').pop()!.split(/[?#]/)[0];
    const local = join('web/public/fonts', name);
    if (name.endsWith('.woff2') && existsSync(local)) return route.fulfill({ body: readFileSync(local), contentType: 'font/woff2' });
    return route.abort();
  });
  if (prepare) await prepare(page);  // extra routes / init scripts (e.g. bd ui's mocked SoundCloud search)
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    let s = 42; Math.random = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    try { localStorage.setItem('SkipTutorial', JSON.stringify({ value: true, expiresAt: 4102444800000 })); } catch {}
  });
  // Virtual time: v1 animates per frame and with timers, so we drive the clock for byte-identical results.
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  const until = async (fn: () => boolean, maxMs: number, label: string) => {
    for (let t = 0; t <= maxMs; t += 50) {
      if (await page.evaluate(fn).catch(() => false)) return;
      await page.clock.runFor(50);
      await page.waitForTimeout(5); // let real I/O (scripts, fonts, images) progress
    }
    throw new Error(`timeout waiting for ${label}`);
  };
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  await until(() => !!((window as any).App?.MainScene && (window as any).App?.Blocks), 20000, 'App');
  await page.evaluate(() => { (window as any).App.SkipTutorial = true; });
  // Wait for the loading splash to finish and slide off-screen (LoadOffset tweens to 1).
  await until(() => { const s = (window as any).App?.Stage?.Splash; return !!(s && s.IsAnimationFinished && s.LoadOffset >= 1); }, 30000, 'splash');
  await page.clock.runFor(300);
  return { page, errors, advance: ms => page.clock.runFor(ms), close: () => ctx.close() };
}

/** Load a v1 composition (save-file JSON shape) into the running app. Returns the block count. */
export async function loadComposition(s: V1Session, composition: any): Promise<number> {
  return s.page.evaluate((c) => {
    const App = (window as any).App;
    try { App.MainScene.Tutorial?.ClosePanel?.(); } catch {}
    // Reseed: the number of random() calls during boot varies with I/O timing; block init (e.g. Void stars) must not.
    let seed = 1234; Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    App.CompositionLoadComplete(JSON.stringify(c));
    const t = App.MainScene.Tutorial;
    if (t?.SplashOpen) t.CloseSplash(); // tour prompt ("Welcome to the Tour") is not part of the stage
    return App.Blocks.length;
  }, composition);
}

/** Geometry + colour state needed to re-render the stage exactly as v1 does (canvas backing-store pixels). */
export async function stageInfo(s: V1Session) {
  return s.page.evaluate(() => {
    const App = (window as any).App;
    const M = App.Metrics;
    return {
      c: { x: M.C.x, y: M.C.y },
      unit: App.Unit,
      gridSize: App.GridSize,
      scaledGridSize: App.ScaledGridSize,
      scaledUnit: App.ScaledUnit,
      zoom: App.ZoomLevel,
      scaledDragOffset: { x: App.ScaledDragOffset.x, y: App.ScaledDragOffset.y },
      pixelRatio: M.PixelRatio,
      canvas: { width: App.Canvas.Width, height: App.Canvas.Height },
      theme: App.ThemeManager.CurrentThemeNo,
      palette: App.Palette.map((c: any) => App.ColorManager.ColorString(c)),
      blocks: App.Blocks.map((b: any) => ({ type: b.constructor.name, x: b.Position.x, y: b.Position.y,
        ...(b.StarPos ? { starPos: { x: b.StarPos.x, y: b.StarPos.y } } : {}) })),
    };
  });
}
