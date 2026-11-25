// pnpm test:video [--only a,b] [--chromium]: video export (CHG-0022, SPEC-SHARING-VIDEO-EXPORT)
// in Google Chrome (its H.264 + AAC encoders) unless --chromium; the MP4 is checked with ffprobe.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright';
import { serveDist } from './serve.ts';
import { THEMES } from '../../web/src/generated/palettes.gen.ts';
import { videoSeconds } from '../../web/src/video/length.ts';
import type { PatchesPanelPrivates } from './pageGlobals.shared.ts';

const OUT = 'tests/e2e/output/video';
mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const { url, server } = await serveDist();
const browser = await chromium.launch({
  channel: args.includes('--chromium') ? undefined : 'chrome',
  args: ['--autoplay-policy=no-user-gesture-required'],
});

interface Block {
  Id: number;
  Type: string;
  Position: { x: number; y: number };
}
const comp = (blocks: Block[]) =>
  encodeURIComponent(
    JSON.stringify({
      Composition: blocks,
      ZoomLevel: 1,
      DragOffset: { x: 0, y: 0 },
      ColorThemeNo: 0,
    }),
  );
const blk = (Id: number, Type: string, x: number, y: number): Block => ({
  Id,
  Type,
  Position: { x, y },
});
/** A powered emitter firing particles, a powered tone through a delay: particles, hits and sound
 * from the start. */
const SCENE = [
  blk(1, 'ParticleEmitter', -8, 0),
  blk(6, 'Power', -10, 0),
  blk(2, 'ToneSource', 2, 0),
  blk(3, 'Power', 2, 6),
  blk(4, 'ToneSource', 6, 6),
  blk(5, 'StereoDelay', 8, 9),
];

/** `share`: 'none', the browser can't share files, so SHARE VIDEO downloads (desktop Chrome);
 * 'sheet', a share sheet that records what it was handed (window.__shared). */
async function open(
  b: Browser,
  blocks: Block[],
  errors: string[],
  share: 'none' | 'sheet' = 'none',
): Promise<Page> {
  const page = await b.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    acceptDownloads: true,
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((mode) => {
    const sharing = navigator as Omit<Navigator, 'share' | 'canShare'> & {
      share?: (data: ShareData) => Promise<void>;
      canShare?: (data: ShareData) => boolean;
    };
    if (mode === 'none') {
      sharing.share = undefined;
      sharing.canShare = undefined;
      return;
    }
    sharing.canShare = (data) => !!data.files?.length;
    sharing.share = (data) => {
      if (!navigator.userActivation.isActive)
        return Promise.reject(new DOMException('needs a click', 'NotAllowedError'));
      const file = data.files?.[0];
      if (!file) return Promise.reject(new TypeError('no file to share'));
      window.__shared = {
        name: file.name,
        type: file.type,
        size: file.size,
        title: data.title,
        text: data.text,
      };
      return Promise.resolve();
    };
  }, share);
  // video=1: MAKE VIDEO is hidden by default (CHG-0035).
  await page.goto(`${url}/index.html?video=1&v1=${comp(blocks)}`);
  await page.waitForFunction(() => window.__bd_probe);
  await page.click('#start');
  await page.waitForFunction(() => window.__bd_probe.state.snapshots > 10);
  await page.waitForTimeout(1200);
  return page;
}
async function click(page: Page, name: string, wait = 500): Promise<void> {
  const centre = await page.evaluate(
    (control) => window.__bd_probe.scene.PatchesPanel.centreOf(control),
    name,
  );
  if (!centre) throw new Error(`no control ${name}`);
  const [x, y] = centre;
  await page.mouse.move(x, y);
  await page.mouse.click(x, y);
  await page.waitForTimeout(wait);
}
/** Patches › SAVE / SHARE. With no server to save to, the video starts as SAVE starts it once
 * saved; test:gallery presses SAVE itself. */
async function openVideoTab(page: Page): Promise<void> {
  await page.evaluate(() => {
    try {
      localStorage.removeItem('blokdust.patchesTab');
    } catch {
      // Storage may be off; the tab is then the default anyway.
    }
  });
  await page.mouse.move(1138, 45);
  await page.mouse.click(1138, 45);
  await page.waitForTimeout(1500);
  await click(page, 'tab0', 1100);
}
const startVideo = (page: Page) =>
  page.evaluate(() => {
    const privates = window.__bd_probe.scene.PatchesPanel as unknown as PatchesPanelPrivates;
    void privates.makeVideo();
  });
const panel = (page: Page) =>
  page.evaluate(() => {
    const patchesPanel = window.__bd_probe.scene.PatchesPanel,
      player = document.getElementById('patchVideo') as HTMLVideoElement;
    return {
      state: patchesPanel.VideoState,
      view: patchesPanel.View,
      message: patchesPanel.VideoMessage,
      progress: patchesPanel.VideoProgress,
      videoOn: (patchesPanel as unknown as PatchesPanelPrivates).videoOn,
      seconds: window.__bd_probe.scene.host.video?.seconds(),
      player: { shown: player.style.display === 'block', src: !!player.src },
    };
  });
/** Make the video and save what downloads (desktop Chrome can't share files: it downloads). */
async function makeAndSave(
  page: Page,
  name: string,
): Promise<{ file: string; ms: number; state: Awaited<ReturnType<typeof panel>> }> {
  const startedAt = Date.now();
  if (await page.evaluate(() => window.__bd_probe.scene.host.video?.canShareFiles()))
    throw new Error('this test expects a browser that downloads videos');
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 180_000 }),
    startVideo(page),
  ]);
  await page.waitForTimeout(300);
  const ms = Date.now() - startedAt,
    state = await panel(page);
  const file = `${OUT}/${name}.mp4`;
  await download.saveAs(file);
  return { file, ms, state };
}
interface Probe {
  streams: {
    codec_type: string;
    codec_name: string;
    width?: number;
    height?: number;
    avg_frame_rate?: string;
    sample_rate?: string;
    channels?: number;
    duration?: string;
  }[];
  format: { duration: string };
}
const ffprobe = (file: string) =>
  JSON.parse(
    execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], {
      encoding: 'utf8',
    }),
  ) as Probe;
/** Mean audio level in dB (ffmpeg volumedetect, which reports on stderr). */
function meanDb(file: string): number {
  const result = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-i', file, '-af', 'volumedetect', '-vn', '-f', 'null', '-'],
    { encoding: 'utf8' },
  );
  return Number(/mean_volume: (-?[\d.]+) dB/.exec(result.stderr)?.[1] ?? -999);
}
/** Distinct decoded frames (framemd5): a moving scene has many. */
const frameHashes = (file: string) =>
  execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-an', '-f', 'framemd5', '-'], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => (line.split(',').pop() ?? '').trim());

/** Decoded frame `index` as rgb24. */
const rawFrame = (file: string, index: number) =>
  execFileSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-i',
      file,
      '-vf',
      `select=eq(n\\,${index})`,
      '-frames:v',
      '1',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      '-',
    ],
    { maxBuffer: 1 << 27 },
  );
/** R6: particles fly. Pixels of the particle colour (the theme's power colour) in one frame and not
 * 5 frames later, or the other way round: blocks and lines don't move, so only particles count. */
function particlesMoving(file: string): number {
  const theme = THEMES[0],
    [red, green, blue] = (theme.colors[theme.roles.power].match(/\d+/g) ?? []).map(Number);
  const isParticle = (frame: Buffer, i: number) =>
    Math.abs(frame[i] - red) + Math.abs(frame[i + 1] - green) + Math.abs(frame[i + 2] - blue) < 60;
  let most = 0;
  for (const index of [45, 90, 135]) {
    const frame = rawFrame(file, index),
      later = rawFrame(file, index + 5);
    let changed = 0;
    for (let i = 0; i + 2 < frame.length; i += 3)
      if (isParticle(frame, i) !== isParticle(later, i)) changed++;
    most = Math.max(most, changed);
  }
  return most;
}

/** H.264 + AAC stereo MP4 of width×height at 30 fps, `seconds` long (or within [min, max]), with
 * particles moving and sound. */
function checkMp4(
  file: string,
  width: number,
  height: number,
  seconds: number | [number, number],
): [boolean, Record<string, unknown>] {
  const probe = ffprobe(file),
    video = probe.streams.find((stream) => stream.codec_type === 'video'),
    audio = probe.streams.find((stream) => stream.codec_type === 'audio');
  const dur = Number(probe.format.duration),
    hashes = frameHashes(file),
    distinct = new Set(hashes).size,
    db = meanDb(file),
    moving = particlesMoving(file);
  const ok =
    video?.codec_name === 'h264' &&
    audio?.codec_name === 'aac' &&
    video.width === width &&
    video.height === height &&
    video.avg_frame_rate === '30/1' &&
    audio.channels === 2 &&
    (typeof seconds === 'number'
      ? Math.abs(dur - seconds) < 0.15
      : dur >= seconds[0] && dur <= seconds[1]) &&
    distinct > 20 &&
    db > -60 &&
    moving > 50;
  return [
    ok,
    {
      video:
        video &&
        `${video.codec_name} ${String(video.width)}x${String(video.height)} ${String(video.avg_frame_rate)}`,
      audio:
        audio && `${audio.codec_name} ${String(audio.sample_rate)} ${String(audio.channels)}ch`,
      duration: dur,
      expected: seconds,
      frames: hashes.length,
      distinct,
      meanDb: db,
      particlePixelsMoving: moving,
    },
  ];
}

const tests: Record<string, (errors: string[]) => Promise<[boolean, unknown]>> = {
  /** R5, R9, R13, R15: portrait; no timers: 15 s, then the 3 s end card. Desktop Chrome downloads
   * it, the player shows it with DOWNLOAD VIDEO, and MAKE VIDEO is off by default there. */
  'portrait-default': async (errors) => {
    const page = await open(browser, SCENE, errors);
    await openVideoTab(page);
    const before = await panel(page);
    const made = await makeAndSave(page, 'portrait-default');
    await page.mouse.move(5, 5);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/player-desktop.png` });
    await page.close();
    if (!made.file) return [false, made];
    const [ok, info] = checkMp4(made.file, 1080, 1920, 18);
    return [
      ok &&
        before.seconds === 15 &&
        !before.videoOn &&
        made.state.state === 'ready' &&
        made.state.view === 'video' &&
        made.state.player.shown &&
        made.state.player.src,
      { ...info, before, after: made.state, ms: made.ms },
    ];
  },
  /** R5: the length is whole cycles of the longest timer, 10–30 s. */
  'length-from-timers': () => {
    const defaults = (_type: string, key: string) =>
      (
        ({ sync: false, turnBeats: 4, division: 1, pulseBeats: 0.25, rate: 1, steps: 8 }) as Record<
          string,
          unknown
        >
      )[key];
    const cases: [string, number, number][] = [
      ['none', videoSeconds([{ type: 'source.tone', params: {} }], 120, defaults), 15],
      ['lfo 1 Hz', videoSeconds([{ type: 'fx.lfo', params: { rate: 1 } }], 120, defaults), 10],
      [
        'lfo 0.07 Hz',
        videoSeconds([{ type: 'fx.lfo', params: { rate: 0.07 } }], 120, defaults),
        Math.round(30 / 0.07) / 30,
      ],
      [
        'laser 32 beats',
        videoSeconds(
          [{ type: 'power.laser', params: { sync: true, turnBeats: -32 } }],
          120,
          defaults,
        ),
        16,
      ],
      [
        'counter 16 × emitter beat',
        videoSeconds(
          [
            { type: 'power.emitter', params: { sync: true } },
            { type: 'power.counter', params: { steps: 16 } },
          ],
          120,
          defaults,
        ),
        16,
      ],
      [
        'lfo 0.02 Hz: capped',
        videoSeconds([{ type: 'fx.lfo', params: { rate: 0.02 } }], 120, defaults),
        30,
      ],
    ];
    return Promise.resolve([cases.every(([, got, want]) => Math.abs(got - want) < 1e-6), cases]);
  },
  /** R13: where the browser can share files, MAKE VIDEO is on by default, and SHARE VIDEO hands the
   * MP4 to the share sheet, in the click, with the title and the link as text. */
  'share-sheet': async (errors) => {
    const page = await open(browser, SCENE, errors, 'sheet');
    await openVideoTab(page);
    const on = (await panel(page)).videoOn;
    await startVideo(page);
    await page.waitForFunction(
      () => window.__bd_probe.scene.PatchesPanel.VideoState === 'ready',
      null,
      { timeout: 120_000 },
    );
    await click(page, 'shareVideo', 500);
    const shared = await page.evaluate(() => window.__shared);
    await page.close();
    return [
      on &&
        !!shared &&
        shared.type === 'video/mp4' &&
        shared.name.endsWith('.mp4') &&
        shared.size > 50_000 &&
        (shared.text ?? '').includes('made with BlokDust') &&
        /https?:\/\//.test(shared.text ?? ''),
      { on, shared },
    ];
  },
  /** R2: the same patch draws the same frames (the encoder may still vary bytes, so decoded frames
   * are compared). */
  'from-start-repeatable': async (errors) => {
    const page = await open(browser, SCENE, errors);
    await openVideoTab(page);
    const first = await makeAndSave(page, 'repeat-a');
    const second = await makeAndSave(page, 'repeat-b');
    await page.close();
    if (!first.file || !second.file) return [false, { a: first, b: second }];
    const firstHashes = frameHashes(first.file),
      secondHashes = frameHashes(second.file),
      same = firstHashes.filter((hash, i) => hash === secondHashes[i]).length;
    return [
      same === firstHashes.length &&
        firstHashes.length === secondHashes.length &&
        firstHashes.length > 0,
      { frames: firstHashes.length, identicalFrames: same },
    ];
  },
  /** R11: CANCEL stops it at once; BACK returns to SAVE / SHARE. */
  cancel: async (errors) => {
    const page = await open(browser, SCENE, errors);
    await openVideoTab(page);
    await startVideo(page);
    await page.waitForTimeout(1500);
    const during = await panel(page);
    // CANCEL.
    await click(page, 'make', 1000);
    const after = await panel(page);
    await click(page, 'videoBack', 500);
    const back = await panel(page);
    await page.close();
    return [
      during.state === 'making' &&
        after.state === 'idle' &&
        back.view === 'list' &&
        !back.player.shown,
      { during, after, back },
    ];
  },
  /** Bug: CANCEL, then at once MAKE VIDEO. The cancelled render was still winding down, so the
   * panel still said making: MAKE cancelled again and nothing was made. */
  'cancel-then-make-at-once': async (errors) => {
    const page = await open(browser, SCENE, errors, 'sheet');
    await openVideoTab(page);
    await startVideo(page);
    await page.waitForTimeout(1500);
    // CANCEL, then MAKE VIDEO.
    await click(page, 'make', 0);
    await click(page, 'make', 0);
    await page
      .waitForFunction(
        () => {
          const videoState = window.__bd_probe.scene.PatchesPanel.VideoState;
          return videoState === 'ready' || videoState === 'error';
        },
        null,
        { timeout: 60_000 },
      )
      .catch(() => {});
    const after = await panel(page);
    await page.close();
    return [after.state === 'ready', after];
  },
};

const results: Record<string, unknown> = {};
let ok = true;
for (const [name, value] of Object.entries(tests)) {
  if (only && !only.includes(name)) continue;
  const errors: string[] = [];
  let pass = false,
    info: unknown;
  try {
    [pass, info] = await value(errors);
  } catch (error) {
    info = String((error as Error).stack ?? error);
  }
  if (errors.length) {
    pass = false;
    info = { info, errors };
  }
  results[name] = { pass, info };
  ok &&= pass;
  console.error(`${pass ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(info)}`);
}
writeFileSync(`${OUT}/summary.json`, JSON.stringify(results, null, 2));
await browser.close();
server.close();
console.log(JSON.stringify({ ok, results }));
process.exit(ok ? 0 : 1);
