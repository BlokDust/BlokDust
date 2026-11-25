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
  effect: [
    'AutoWah',
    'BitCrusher',
    'Chomp',
    'Chopper',
    'Chorus',
    'Convolver',
    'StereoDelay',
    'Distortion',
    'Envelope',
    'EQ',
    'Filter',
    'Vibrato',
    'Phaser',
    'PitchShifter',
    'Reverb',
    'Scuzz',
    'Volume',
  ],
  power: ['ParticleEmitter', 'Power', 'Toggle', 'Void', 'Pulse', 'Laser'],
  interaction: ['ComputerKeyboard', 'MIDIController'],
};

const runOrThrow = (command: string, args: string[]) => {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed`);
};

export function fetchV1() {
  if (existsSync(join(DIST, 'index.html'))) {
    console.error(`v1 already at ${V1_DIR}`);
    return;
  }
  mkdirSync(V1_DIR, { recursive: true });
  runOrThrow('git', ['-C', V1_DIR, 'init', '-q']);
  runOrThrow('git', ['-C', V1_DIR, 'fetch', '-q', '--depth', '1', V1_REPO, V1_SHA]);
  runOrThrow('git', ['-C', V1_DIR, 'checkout', '-q', 'FETCH_HEAD']);
}

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export function serve(port: number): Promise<Server> {
  if (!existsSync(join(DIST, 'index.html')))
    throw new Error('v1 not fetched: run `pnpm bd v1 fetch`');
  const server = createServer((request, response) => {
    let urlPath = normalize(decodeURIComponent((request.url ?? '/').split('?')[0])).replace(
      /^(\.\.[/\\])+/,
      '',
    );
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const file = join(DIST, urlPath);
    if (!existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    response
      .writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
      .end(readFileSync(file));
  });
  return new Promise((resolve) =>
    server.listen(port, () => {
      resolve(server);
    }),
  );
}

export const randomPort = () => 8731 + Math.floor(Math.random() * 1000);

export interface V1Session {
  page: Page;
  errors: string[];
  advance: (ms: number) => Promise<void>;
  close: () => Promise<void>;
}

export interface OfflineAudio {
  seconds: number;
  sampleRate: number;
}

/** Boot v1 on virtual time, seeded randomness, no tutorial, loading splash finished. */
export async function bootV1(
  browser: Browser,
  port: number,
  viewport: { width: number; height: number },
  dpr = 1,
  offline?: OfflineAudio,
  prepare?: (page: Page) => Promise<void>,
): Promise<V1Session> {
  const context = await browser.newContext({ viewport, deviceScaleFactor: dpr });
  const page = await context.newPage();
  if (offline) {
    // Audio references (CHG-0002 1.1): Tone.js gets an OfflineAudioContext that says "running"
    // (hasAudioContextStarted), so v1's own DSP renders deterministically on startRendering().
    await page.addInitScript(({ seconds, sampleRate }) => {
      const Offline = window.OfflineAudioContext;
      function FakeAudioContext() {
        const offline = new Offline(2, Math.round(seconds * sampleRate), sampleRate);
        Object.defineProperty(offline, 'state', { get: () => 'running' });
        offline.resume = () => Promise.resolve();
        window.__bdOffline = offline;
        return offline;
      }
      FakeAudioContext.prototype = Offline.prototype;
      Object.assign(window, { AudioContext: FakeAudioContext, webkitAudioContext: FakeAudioContext });
    }, offline);
  }
  // v1's fonts came from files.blokdust.io (no longer ours): serve the identical web/public/fonts.
  await page.route('https://files.blokdust.io/fonts/**', (route) => {
    const name = (route.request().url().split('/').pop() ?? '').split(/[?#]/)[0];
    const local = join('web/public/fonts', name);
    if (name.endsWith('.woff2') && existsSync(local))
      return route.fulfill({ body: readFileSync(local), contentType: 'font/woff2' });
    return route.abort();
  });
  // Extra routes or init scripts (e.g. bd ui's mocked SoundCloud search).
  if (prepare) await prepare(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    let seed = 42;
    Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    try {
      localStorage.setItem(
        'SkipTutorial',
        JSON.stringify({ value: true, expiresAt: 4102444800000 }),
      );
    } catch {
      // storage blocked: the tutorial shows, which bootV1 closes anyway
    }
  });
  // Virtual time: v1 animates per frame and with timers; driving the clock makes results identical.
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  const until = async (condition: () => boolean, maxMs: number, label: string) => {
    for (let elapsed = 0; elapsed <= maxMs; elapsed += 50) {
      if (await page.evaluate(condition).catch(() => false)) return;
      await page.clock.runFor(50);
      await page.waitForTimeout(5); // let real I/O (scripts, fonts, images) progress
    }
    throw new Error(`timeout waiting for ${label}`);
  };
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  await until(
    () => !!(window.App?.MainScene && window.App.Blocks),
    20000,
    'App',
  );
  await page.evaluate(() => {
    if (window.App) window.App.SkipTutorial = true;
  });
  // Wait for the loading splash to finish and slide off-screen (LoadOffset tweens to 1).
  await until(
    () => {
      const splash = window.App?.Stage?.Splash;
      return !!(splash?.IsAnimationFinished && splash.LoadOffset >= 1);
    },
    30000,
    'splash',
  );
  await page.clock.runFor(300);
  return { page, errors, advance: (ms) => page.clock.runFor(ms), close: () => context.close() };
}

/** Load a v1 composition (save-file JSON shape) into the running app. Returns the block count. */
export async function loadComposition(session: V1Session, composition: unknown): Promise<number> {
  return session.page.evaluate((saved) => {
    const App = window.App;
    if (!App) throw new Error('v1 has not booted');
    try {
      App.MainScene.Tutorial?.ClosePanel?.();
    } catch {
      // no tutorial panel open
    }
    // Reseed: boot's random() count varies with I/O timing; block init (e.g. Void stars) must not.
    let seed = 1234;
    Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    App.CompositionLoadComplete(JSON.stringify(saved));
    const tutorial = App.MainScene.Tutorial;
    if (tutorial?.SplashOpen) tutorial.CloseSplash(); // the tour prompt is not part of the stage
    return App.Blocks.length;
  }, composition);
}

/** Geometry and colours needed to re-render the stage exactly as v1 does (backing-store pixels). */
export async function stageInfo(session: V1Session) {
  return session.page.evaluate(() => {
    const App = window.App;
    if (!App) throw new Error('v1 has not booted');
    const metrics = App.Metrics;
    return {
      c: { x: metrics.C.x, y: metrics.C.y },
      unit: App.Unit,
      gridSize: App.GridSize,
      scaledGridSize: App.ScaledGridSize,
      scaledUnit: App.ScaledUnit,
      zoom: App.ZoomLevel,
      scaledDragOffset: { x: App.ScaledDragOffset.x, y: App.ScaledDragOffset.y },
      pixelRatio: metrics.PixelRatio,
      canvas: { width: App.Canvas.Width, height: App.Canvas.Height },
      theme: App.ThemeManager.CurrentThemeNo,
      palette: App.Palette.map((color) => App.ColorManager.ColorString(color)),
      blocks: App.Blocks.map((block) => ({
        type: block.constructor.name,
        x: block.Position.x,
        y: block.Position.y,
        ...(block.StarPos ? { starPos: { x: block.StarPos.x, y: block.StarPos.y } } : {}),
      })),
    };
  });
}
