// Video export (CHG-0022, SPEC-SHARING-VIDEO-EXPORT): the real app, real AudioWorklet, real pointer.
//   pnpm test:video [--only name,name] [--chromium]
// Runs in Google Chrome (H.264 + AAC encoders, as users have) unless --chromium; checks the MP4 with ffprobe.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright';
import { serveDist } from './serve.ts';
import { THEMES } from '../../web/src/generated/palettes.gen.ts';

const OUT = 'tests/e2e/output/video';
mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const { url, server } = await serveDist();
const browser = await chromium.launch({ channel: args.includes('--chromium') ? undefined : 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });

type Block = { Id: number; Type: string; Position: { x: number; y: number } };
const comp = (blocks: Block[]) => encodeURIComponent(JSON.stringify({ Composition: blocks, ZoomLevel: 1, DragOffset: { x: 0, y: 0 }, ColorThemeNo: 0 }));
const blk = (Id: number, Type: string, x: number, y: number): Block => ({ Id, Type, Position: { x, y } });
/** A powered emitter firing particles, a powered tone through a delay: particles, hits and sound from the start. */
const SCENE = [blk(1, 'ParticleEmitter', -8, 0), blk(6, 'Power', -10, 0), blk(2, 'ToneSource', 2, 0), blk(3, 'Power', 2, 6), blk(4, 'ToneSource', 6, 6), blk(5, 'StereoDelay', 8, 9)];

async function open(b: Browser, blocks: Block[], errors: string[], viewport = { width: 1280, height: 800 }): Promise<Page> {
  const page = await b.newPage({ viewport, deviceScaleFactor: 1, acceptDownloads: true });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${url}/index.html?v1=${comp(blocks)}`);
  await page.waitForFunction(() => (window as any).__bd_probe);
  await page.click('#start');
  await page.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
  await page.waitForTimeout(1200);
  return page;
}
const centre = (p: Page, name: string) => p.evaluate(n => (window as any).__bd_probe.scene.PatchesPanel.centreOf(n), name) as Promise<[number, number]>;
async function click(p: Page, name: string, wait = 500): Promise<void> { const [x, y] = await centre(p, name); await p.mouse.move(x, y); await p.mouse.click(x, y); await p.waitForTimeout(wait); }
/** Patches › VIDEO (the header's PATCHES slot opens the panel). */
async function openVideoTab(p: Page): Promise<void> {
  await p.evaluate(() => { try { localStorage.removeItem('blokdust.patchesTab'); } catch { /* */ } });
  await p.mouse.move(1138, 45); await p.mouse.click(1138, 45); await p.waitForTimeout(1500);
  await click(p, 'tab2', 700);
}
const panel = (p: Page) => p.evaluate(() => { const pp = (window as any).__bd_probe.scene.PatchesPanel; return { state: pp.VideoState, message: pp.VideoMessage, progress: pp.VideoProgress, choice: pp.Video }; });
/** Drag block `id` by (dx, dy) grid cells with the real pointer. */
async function dragBlock(p: Page, id: number, dx: number, dy: number): Promise<void> {
  const [x, y] = await p.evaluate(i => (window as any).__bd_probe.blockPoint(i), id) as [number, number];
  const g = await p.evaluate(() => { const s = (window as any).__bd_probe; const [a] = s.toCss(0, 0), [b] = s.toCss(1, 0); return b - a; });
  await p.mouse.move(x, y); await p.mouse.down();
  for (let k = 1; k <= 10; k++) { await p.mouse.move(x + (dx * g * k) / 10, y + (dy * g * k) / 10); await p.waitForTimeout(30); }
  await p.mouse.up();
}
/** Make a video from the VIDEO tab and save it; returns the file and how long making it took. */
async function makeAndSave(p: Page, name: string, choose: string[]): Promise<{ file: string; ms: number; state: unknown }> {
  for (const c of choose) await click(p, c, 300);
  const t0 = Date.now();
  await click(p, 'make', 200);
  await p.waitForFunction(() => { const s = (window as any).__bd_probe.scene.PatchesPanel.VideoState; return s === 'ready' || s === 'error'; }, null, { timeout: 180_000 });
  const ms = Date.now() - t0, state = await panel(p);
  if ((state as { state: string }).state !== 'ready') return { file: '', ms, state };
  const [x, y] = await centre(p, 'downloadVideo');
  const [download] = await Promise.all([p.waitForEvent('download'), p.mouse.click(x, y)]);
  const file = `${OUT}/${name}.mp4`;
  await download.saveAs(file);
  return { file, ms, state };
}
interface Probe { streams: { codec_type: string; codec_name: string; width?: number; height?: number; avg_frame_rate?: string; sample_rate?: string; channels?: number; duration?: string }[]; format: { duration: string } }
const ffprobe = (file: string): Probe => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }));
/** Mean audio level in dB (ffmpeg volumedetect, which reports on stderr). */
function meanDb(file: string): number {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'volumedetect', '-vn', '-f', 'null', '-'], { encoding: 'utf8' });
  return Number(/mean_volume: (-?[\d.]+) dB/.exec(r.stderr)?.[1] ?? -999);
}
/** Distinct decoded frames (framemd5): a moving scene has many. */
const frameHashes = (file: string) => execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-an', '-f', 'framemd5', '-'], { encoding: 'utf8' }).split('\n').filter(l => l && !l.startsWith('#')).map(l => l.split(',').pop()!.trim());

/** Decoded frame `n` as rgb24. */
const rawFrame = (file: string, n: number) => execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `select=eq(n\\,${n})`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 27 });
/** R6: particles fly. Pixels that are the particle colour (the theme's power colour) in frame n and not 5 frames later,
 * or the other way round: blocks and lines don't move, so only particles (and beams) count. */
function particlesMoving(file: string): number {
  const t = THEMES[0], [r, g, b] = t.colors[t.roles.power].match(/\d+/g)!.map(Number);
  const is = (x: Buffer, i: number) => Math.abs(x[i] - r) + Math.abs(x[i + 1] - g) + Math.abs(x[i + 2] - b) < 60;
  let most = 0;
  for (const n of [45, 90, 135]) {
    const a = rawFrame(file, n), c = rawFrame(file, n + 5);
    let k = 0;
    for (let i = 0; i + 2 < a.length; i += 3) if (is(a, i) !== is(c, i)) k++;
    most = Math.max(most, k);
  }
  return most;
}

/** H.264 + AAC stereo MP4 of w×h at 30 fps, `seconds` long (or within [min, max]), with particles moving and sound. */
function checkMp4(file: string, w: number, h: number, seconds: number | [number, number]): [boolean, Record<string, unknown>] {
  const pr = ffprobe(file), v = pr.streams.find(s => s.codec_type === 'video'), a = pr.streams.find(s => s.codec_type === 'audio');
  const dur = Number(pr.format.duration), hashes = frameHashes(file), distinct = new Set(hashes).size, db = meanDb(file), moving = particlesMoving(file);
  const ok = v?.codec_name === 'h264' && a?.codec_name === 'aac' && v.width === w && v.height === h && v.avg_frame_rate === '30/1'
    && a.channels === 2 && (typeof seconds === 'number' ? Math.abs(dur - seconds) < 0.15 : dur >= seconds[0] && dur <= seconds[1]) && distinct > 20 && db > -60 && moving > 50;
  return [ok, { video: v && `${v.codec_name} ${v.width}x${v.height} ${v.avg_frame_rate}`, audio: a && `${a.codec_name} ${a.sample_rate} ${a.channels}ch`, duration: dur, expected: seconds, frames: hashes.length, distinct, meanDb: db, particlePixelsMoving: moving }];
}

const tests: Record<string, (errors: string[]) => Promise<[boolean, unknown]>> = {
  /** R1–R2: what the worklet played, replayed offline from its log, is identical sample for sample — with blocks dragged
   * (connections change) and a block added from the panel's model during the capture. */
  'replay-matches-worklet': async errors => {
    const p = await open(browser, SCENE, errors);
    await p.evaluate(() => (window as any).__bd_probe.startCapture());
    await p.waitForTimeout(700);
    await dragBlock(p, 2, -3, 1);
    await p.waitForTimeout(500);
    await dragBlock(p, 4, 0, -4);   // into and out of other blocks' reach
    await p.waitForTimeout(400);
    await dragBlock(p, 4, 0, 4);
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => (window as any).__bd_probe.replayCheck());
    await p.close();
    return [!!r && r.firstDiff === -1 && r.live === r.replay && r.peak > 0.01 && r.frames > 48000 && r.entries > 3, r];
  },
  /** R5, R6, R9, R10, R15: JUST PLAYED, portrait 15 s (the session is shorter: all of it), then the end card. */
  'just-played-portrait': async errors => {
    const p = await open(browser, SCENE, errors);
    await p.waitForTimeout(4000);
    await dragBlock(p, 2, -2, 0);
    await p.waitForTimeout(1000);
    await openVideoTab(p);
    const r = await makeAndSave(p, 'just-played-portrait', ['len0']);
    await p.close();
    if (!r.file) return [false, r];
    const [ok, info] = checkMp4(r.file, 1080, 1920, [3 + 6, 3 + 15]);  // the whole session (~7 s), then the end card
    return [ok, { ...info, ms: r.ms }];
  },
  /** R5, R9: FROM START, square, 15 s exactly + the 3 s end card. */
  'from-start-square': async errors => {
    const p = await open(browser, SCENE, errors);
    await openVideoTab(p);
    const r = await makeAndSave(p, 'from-start-square', ['shape1', 'len0', 'what1']);
    await p.close();
    if (!r.file) return [false, r];
    const [ok, info] = checkMp4(r.file, 1080, 1080, 18);
    return [ok, { ...info, ms: r.ms }];
  },
  /** R12: the same patch, length and shape draw the same frames (the encoder may still vary bytes, so compare decoded
   * frames; WIDE this time). */
  'from-start-repeatable': async errors => {
    const p = await open(browser, SCENE, errors);
    await openVideoTab(p);
    const a = await makeAndSave(p, 'repeat-a', ['shape2', 'len0', 'what1']);
    await click(p, 'shape1', 200); await click(p, 'shape2', 200);  // a new choice drops the made video
    const b = await makeAndSave(p, 'repeat-b', []);
    await p.close();
    if (!a.file || !b.file) return [false, { a, b }];
    const ha = frameHashes(a.file), hb = frameHashes(b.file), same = ha.filter((h, i) => h === hb[i]).length;
    const [ok, info] = checkMp4(a.file, 1920, 1080, 18);
    return [ok && same === ha.length && ha.length === hb.length, { ...info, frames: ha.length, identicalFrames: same }];
  },
  /** R11: CANCEL stops it and the panel can make another. */
  'cancel': async errors => {
    const p = await open(browser, SCENE, errors);
    await openVideoTab(p);
    await click(p, 'len2', 200); await click(p, 'what1', 200);
    await click(p, 'make', 1500);
    const during = await panel(p);
    await click(p, 'make', 1000);  // CANCEL
    const after = await panel(p);
    await p.close();
    return [during.state === 'making' && after.state === 'idle', { during, after }];
  },
  /** Bug (found making screenshots): CANCEL, then at once a new choice and MAKE VIDEO. The cancelled render was still
   * winding down, so the panel still said making: the new choice was ignored, MAKE cancelled again, nothing was made. */
  'cancel-then-make-at-once': async errors => {
    const p = await open(browser, SCENE, errors);
    await openVideoTab(p);
    await click(p, 'len2', 200); await click(p, 'what1', 200);
    await click(p, 'make', 1500);
    await click(p, 'make', 0);   // CANCEL
    await click(p, 'len0', 0);   // 15 s
    await click(p, 'make', 0);
    await p.waitForFunction(() => { const s = (window as any).__bd_probe.scene.PatchesPanel.VideoState; return s === 'ready' || s === 'error'; }, null, { timeout: 30_000 }).catch(() => {});
    const after = await panel(p);
    await p.close();
    return [after.state === 'ready' && after.choice.seconds === 15, after];
  },
};

const results: Record<string, unknown> = {};
let ok = true;
for (const [name, t] of Object.entries(tests)) {
  if (only && !only.includes(name)) continue;
  const errors: string[] = [];
  let pass = false, info: unknown;
  try { [pass, info] = await t(errors); } catch (e) { info = String((e as Error).stack ?? e); }
  if (errors.length) { pass = false; info = { info, errors }; }
  results[name] = { pass, info };
  ok &&= pass;
  console.error(`${pass ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(info)}`);
}
writeFileSync(`${OUT}/summary.json`, JSON.stringify(results, null, 2));
await browser.close();
server.close();
console.log(JSON.stringify({ ok, results }));
process.exit(ok ? 0 : 1);
