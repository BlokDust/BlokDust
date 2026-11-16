// Video export (CHG-0022, SPEC-SHARING-VIDEO-EXPORT): the real app, real AudioWorklet, real pointer.
// (dragBlock is kept for tests that move blocks while a video is being made.)
//   pnpm test:video [--only name,name] [--chromium]
// Runs in Google Chrome (H.264 + AAC encoders, as users have) unless --chromium; checks the MP4 with ffprobe.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright';
import { serveDist } from './serve.ts';
import { THEMES } from '../../web/src/generated/palettes.gen.ts';
import { videoSeconds } from '../../web/src/video/length.ts';

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

/** `share`: 'none' — the browser can't share files, so SHARE VIDEO downloads (desktop Chrome); 'sheet' — a share
 * sheet that records what it was handed (window.__shared). */
async function open(b: Browser, blocks: Block[], errors: string[], share: 'none' | 'sheet' = 'none'): Promise<Page> {
  const page = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, acceptDownloads: true });
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(mode => {
    const n = navigator as any;
    if (mode === 'none') { n.share = undefined; n.canShare = undefined; return; }
    n.canShare = (d: any) => !!d?.files?.length;
    n.share = async (d: any) => {
      if (!(navigator as any).userActivation?.isActive) throw new DOMException('needs a click', 'NotAllowedError');
      const f = d.files[0];
      (window as any).__shared = { name: f.name, type: f.type, size: f.size, title: d.title, text: d.text };
    };
  }, share);
  await page.goto(`${url}/index.html?v1=${comp(blocks)}`);
  await page.waitForFunction(() => (window as any).__bd_probe);
  await page.click('#start');
  await page.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
  await page.waitForTimeout(1200);
  return page;
}
const centre = (p: Page, name: string) => p.evaluate(n => (window as any).__bd_probe.scene.PatchesPanel.centreOf(n), name) as Promise<[number, number]>;
async function click(p: Page, name: string, wait = 500): Promise<void> { const [x, y] = await centre(p, name); await p.mouse.move(x, y); await p.mouse.click(x, y); await p.waitForTimeout(wait); }
/** Patches › SAVE / SHARE (the header's PATCHES slot opens the panel). These tests have no server to save to, so the
 * video is started as SAVE starts it once saved (owner review 2, option A); test:gallery presses SAVE itself. */
async function openVideoTab(p: Page): Promise<void> {
  await p.evaluate(() => { try { localStorage.removeItem('blokdust.patchesTab'); } catch { /* */ } });
  await p.mouse.move(1138, 45); await p.mouse.click(1138, 45); await p.waitForTimeout(1500);
  await click(p, 'tab0', 700);
}
const startVideo = (p: Page) => p.evaluate(() => { void (window as any).__bd_probe.scene.PatchesPanel.makeVideo(); });
const panel = (p: Page) => p.evaluate(() => { const pp = (window as any).__bd_probe.scene.PatchesPanel, v = document.getElementById('patchVideo') as HTMLVideoElement;
  return { state: pp.VideoState, view: pp.View, message: pp.VideoMessage, progress: pp.VideoProgress, videoOn: pp.videoOn, seconds: (window as any).__bd_probe.scene.host.video.seconds(), player: { shown: v.style.display === 'block', src: !!v.src } }; });
/** Drag block `id` by (dx, dy) grid cells with the real pointer. */
async function dragBlock(p: Page, id: number, dx: number, dy: number): Promise<void> {
  const [x, y] = await p.evaluate(i => (window as any).__bd_probe.blockPoint(i), id) as [number, number];
  const g = await p.evaluate(() => { const s = (window as any).__bd_probe; const [a] = s.toCss(0, 0), [b] = s.toCss(1, 0); return b - a; });
  await p.mouse.move(x, y); await p.mouse.down();
  for (let k = 1; k <= 10; k++) { await p.mouse.move(x + (dx * g * k) / 10, y + (dy * g * k) / 10); await p.waitForTimeout(30); }
  await p.mouse.up();
}
/** Make the video and save what downloads (desktop Chrome can't share files: it downloads once made). */
async function makeAndSave(p: Page, name: string): Promise<{ file: string; ms: number; state: Awaited<ReturnType<typeof panel>> }> {
  const t0 = Date.now();
  if (await p.evaluate(() => (window as any).__bd_probe.scene.host.video.canShareFiles())) throw new Error('this test expects a browser that downloads videos');
  const [download] = await Promise.all([p.waitForEvent('download', { timeout: 180_000 }), startVideo(p)]);
  await p.waitForTimeout(300);
  const ms = Date.now() - t0, state = await panel(p);
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
  /** R5, R9, R13, R15: portrait only; a patch without timers runs 15 s, then the 3 s end card. Desktop Chrome can't
   * share files, so it downloads once made, and the player shows it with DOWNLOAD VIDEO; MAKE VIDEO is off by default
   * there. */
  'portrait-default': async errors => {
    const p = await open(browser, SCENE, errors);
    await openVideoTab(p);
    const before = await panel(p);
    const r = await makeAndSave(p, 'portrait-default');
    await p.mouse.move(5, 5); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/player-desktop.png` });
    await p.close();
    if (!r.file) return [false, r];
    const [ok, info] = checkMp4(r.file, 1080, 1920, 18);
    return [ok && before.seconds === 15 && before.videoOn === false && r.state.state === 'ready' && r.state.view === 'video' && r.state.player.shown && r.state.player.src,
      { ...info, before, after: r.state, ms: r.ms }];
  },
  /** R5 (owner review 2): the length is whole cycles of the longest timer, 10–30 s. */
  'length-from-timers': async () => {
    const d = (type: string, key: string) => ({ sync: false, turnBeats: 4, division: 1, pulseBeats: 0.25, rate: 1, steps: 8 } as Record<string, unknown>)[key];
    const cases: [string, number, number][] = [
      ['none', videoSeconds([{ type: 'source.tone', params: {} }], 120, d), 15],
      ['lfo 1 Hz', videoSeconds([{ type: 'fx.lfo', params: { rate: 1 } }], 120, d), 10],
      ['lfo 0.07 Hz', videoSeconds([{ type: 'fx.lfo', params: { rate: 0.07 } }], 120, d), Math.round(30 / 0.07) / 30],
      ['laser 32 beats', videoSeconds([{ type: 'power.laser', params: { sync: true, turnBeats: -32 } }], 120, d), 16],
      ['counter 16 × emitter beat', videoSeconds([{ type: 'power.emitter', params: { sync: true } }, { type: 'power.counter', params: { steps: 16 } }], 120, d), 16],
      ['lfo 0.02 Hz: capped', videoSeconds([{ type: 'fx.lfo', params: { rate: 0.02 } }], 120, d), 30],
    ];
    return [cases.every(([, got, want]) => Math.abs(got - want) < 1e-6), cases];
  },
  /** R13: where the browser can share files, MAKE VIDEO is on by default, and SHARE VIDEO under the player hands the
   * MP4 to the share sheet, in the click, with the title and the link as text. */
  'share-sheet': async errors => {
    const p = await open(browser, SCENE, errors, 'sheet');
    await openVideoTab(p);
    const on = (await panel(p)).videoOn;
    await startVideo(p);
    await p.waitForFunction(() => (window as any).__bd_probe.scene.PatchesPanel.VideoState === 'ready', null, { timeout: 120_000 });
    await click(p, 'shareVideo', 500);
    const shared = await p.evaluate(() => (window as any).__shared);
    await p.close();
    return [on === true && !!shared && shared.type === 'video/mp4' && /\.mp4$/.test(shared.name) && shared.size > 50_000 && /made with BlokDust/.test(shared.text) && /https?:\/\//.test(shared.text), { on, shared }];
  },
  /** R2: the same patch draws the same frames (the encoder may still vary bytes, so compare decoded frames). */
  'from-start-repeatable': async errors => {
    const p = await open(browser, SCENE, errors);
    await openVideoTab(p);
    const a = await makeAndSave(p, 'repeat-a');
    const b = await makeAndSave(p, 'repeat-b');
    await p.close();
    if (!a.file || !b.file) return [false, { a, b }];
    const ha = frameHashes(a.file), hb = frameHashes(b.file), same = ha.filter((h, i) => h === hb[i]).length;
    return [same === ha.length && ha.length === hb.length && ha.length > 0, { frames: ha.length, identicalFrames: same }];
  },
  /** R11: CANCEL stops it at once; BACK returns to SAVE / SHARE. */
  'cancel': async errors => {
    const p = await open(browser, SCENE, errors);
    await openVideoTab(p);
    await startVideo(p); await p.waitForTimeout(1500);
    const during = await panel(p);
    await click(p, 'make', 1000);  // CANCEL
    const after = await panel(p);
    await click(p, 'videoBack', 500);
    const back = await panel(p);
    await p.close();
    return [during.state === 'making' && after.state === 'idle' && back.view === 'list' && !back.player.shown, { during, after, back }];
  },
  /** Bug (found making screenshots): CANCEL, then at once MAKE VIDEO. The cancelled render was still winding down, so
   * the panel still said making: MAKE cancelled again and nothing was made. */
  'cancel-then-make-at-once': async errors => {
    const p = await open(browser, SCENE, errors, 'sheet');
    await openVideoTab(p);
    await startVideo(p); await p.waitForTimeout(1500);
    await click(p, 'make', 0);   // CANCEL
    await click(p, 'make', 0);   // MAKE VIDEO
    await p.waitForFunction(() => { const s = (window as any).__bd_probe.scene.PatchesPanel.VideoState; return s === 'ready' || s === 'error'; }, null, { timeout: 60_000 }).catch(() => {});
    const after = await panel(p);
    await p.close();
    return [after.state === 'ready', after];
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
