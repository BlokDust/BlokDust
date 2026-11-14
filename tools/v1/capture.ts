// bd v1 capture — deterministic reference screenshots of v1 compositions and of every block type.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { V1_BLOCKS, V1_SHA, bootV1, loadComposition, randomPort, serve, stageInfo } from './lib.ts';

interface Fixture {
  name: string; viewport?: { width: number; height: number }; settleMs?: number; hideLoading?: boolean; composition: any;
  /** Pin Math.random after loading (v1 draws laser beams with a random width every frame). */
  pinRandom?: number;
}

export function blockFixtures(): Fixture[] {
  return Object.entries(V1_BLOCKS).flatMap(([cat, types]) => types.map(t => ({
    // Per-block references show the sprite only: v1's transient "loading" bubble (AnimationsLayer) is a state, not geometry.
    name: `block-${cat}-${t}`, viewport: { width: 800, height: 600 }, hideLoading: true,
    // v1 zoom only snaps to slots 0.25, 0.5, 1, 2, 4 (UI/ZoomButtons.ts).
    composition: { ZoomLevel: 2, DragOffset: { x: 0, y: 0 }, Composition: [{ Id: 1, Type: t, Position: { x: 0, y: 0 }, ZIndex: 1 }] },
  })));
}

export async function capture(args: string[]) {
  const { chromium } = await import('playwright');
  const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const out = opt('--out') ?? 'tests/visual/reference/v1';
  const themesArg = opt('--themes') ?? '0';
  const themes = themesArg === 'all' ? [...Array(13).keys()] : themesArg.split(',').map(Number);
  const dpr = Number(opt('--dpr') ?? 1);
  const only = opt('--only')?.split(',');
  const files = args.filter((a, i) => a.endsWith('.json') && !args[i - 1]?.startsWith('--'));
  let fixtures: Fixture[] = files.map(f => ({ name: basename(f, '.json'), ...JSON.parse(readFileSync(f, 'utf8')) }));
  if (args.includes('--blocks')) fixtures.push(...blockFixtures());
  if (only) fixtures = fixtures.filter(f => only.includes(f.name));
  if (!fixtures.length) throw new Error('no fixtures: pass fixture .json files and/or --blocks');

  mkdirSync(out, { recursive: true });
  const port = randomPort();
  const server = await serve(port);
  const browser = await chromium.launch();
  const results: any[] = [];
  const jobs = Math.max(1, Number(opt('--jobs') ?? 6));
  const queue = fixtures.flatMap(fx => themes.map(theme => ({ fx, theme })));
  const one = async ({ fx, theme }: { fx: Fixture; theme: number }) => {
    const viewport = fx.viewport ?? { width: 1280, height: 800 };
    const s = await bootV1(browser, port, viewport, dpr);
    try {
      const composition = { ZoomLevel: 1, DragOffset: { x: 0, y: 0 }, Version: '1.0.12', Parent: '', ...fx.composition, ColorThemeNo: theme };
      const loaded = await loadComposition(s, composition);
      await s.advance(fx.settleMs ?? 2500);
      if (fx.hideLoading) {
        await s.page.evaluate(() => { (window as any).App.AnimationsLayer.ActiveBlocks = []; });
        await s.advance(100); // let a frame redraw without the overlay
      }
      if (fx.pinRandom !== undefined) {
        await s.page.evaluate((r) => { Math.random = () => r; }, fx.pinRandom);
        await s.advance(100);
      }
      await s.page.evaluate(() => { (window as any).App.MainScene.IsPaused = true; });
      const stage = await stageInfo(s);
      const name = (themes.length > 1 || theme !== 0 ? `${fx.name}.theme${theme}` : fx.name) + (dpr !== 1 ? `@${dpr}x` : '');
      const png = join(out, `${name}.png`);
      const buf = await s.page.screenshot({ path: png });
      results.push({ name, png, fixture: fx.name, composition, blocks: loaded, viewport, dpr, theme, pinRandom: fx.pinRandom,
        sha256: createHash('sha256').update(buf).digest('hex'), stage, errors: s.errors });
      console.error(`captured ${png} (${loaded} blocks${s.errors.length ? `, ${s.errors.length} page errors` : ''})`);
    } finally { await s.close(); }
  };
  try {
    // Each capture is an isolated browser context on virtual time, so captures can run concurrently.
    await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => { for (let t; (t = queue.shift());) await one(t); }));
  } finally { await browser.close(); server.close(); }
  const manifestPath = join(out, 'manifest.json');
  const prev = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')).results ?? [] : [];
  const merged = [...prev.filter((r: any) => !results.some(n => n.name === r.name)), ...results].sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(manifestPath, JSON.stringify({ v1Sha: V1_SHA, results: merged }, null, 2) + '\n');
  console.log(JSON.stringify({ out, captured: results.length, withErrors: results.filter(r => r.errors.length).length }));
}
