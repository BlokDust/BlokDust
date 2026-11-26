// bd v1 capture — deterministic reference screenshots of v1 compositions and of every block type.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { V1_BLOCKS, V1_SHA, bootV1, loadComposition, randomPort, serve, stageInfo } from './lib.ts';

interface Fixture {
  name: string;
  viewport?: { width: number; height: number };
  settleMs?: number;
  hideLoading?: boolean;
  composition: Record<string, unknown>;
  /** Pin Math.random after loading (v1 draws laser beams with a random width every frame). */
  pinRandom?: number;
}

interface CaptureResult {
  name: string;
  png: string;
  fixture: string;
  composition: Record<string, unknown>;
  blocks: number;
  viewport: { width: number; height: number };
  dpr: number;
  theme: number;
  pinRandom?: number;
  sha256: string;
  stage: Awaited<ReturnType<typeof stageInfo>>;
  errors: string[];
}

export function blockFixtures(): Fixture[] {
  return Object.entries(V1_BLOCKS).flatMap(([category, types]) =>
    types.map((type) => ({
      // Per-block references show the sprite only: v1's "loading" bubble is a state, not geometry.
      name: `block-${category}-${type}`,
      viewport: { width: 800, height: 600 },
      hideLoading: true,
      // v1 zoom only snaps to slots 0.25, 0.5, 1, 2, 4 (UI/ZoomButtons.ts).
      composition: {
        ZoomLevel: 2,
        DragOffset: { x: 0, y: 0 },
        Composition: [{ Id: 1, Type: type, Position: { x: 0, y: 0 }, ZIndex: 1 }],
      },
    })),
  );
}

export async function capture(args: string[]) {
  const { chromium } = await import('playwright');
  const opt = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const out = opt('--out') ?? 'tests/visual/reference/v1';
  const themesArg = opt('--themes') ?? '0';
  const themes = themesArg === 'all' ? [...Array(13).keys()] : themesArg.split(',').map(Number);
  const dpr = Number(opt('--dpr') ?? 1);
  const only = opt('--only')?.split(',');
  const files = args.filter((arg, i) => arg.endsWith('.json') && !args[i - 1]?.startsWith('--'));
  let fixtures: Fixture[] = files.map((file) => ({
    name: basename(file, '.json'),
    ...(JSON.parse(readFileSync(file, 'utf8')) as Omit<Fixture, 'name'>),
  }));
  if (args.includes('--blocks')) fixtures.push(...blockFixtures());
  if (only) fixtures = fixtures.filter((fixture) => only.includes(fixture.name));
  if (!fixtures.length) throw new Error('no fixtures: pass fixture .json files and/or --blocks');

  mkdirSync(out, { recursive: true });
  const port = randomPort();
  const server = await serve(port);
  const browser = await chromium.launch();
  const results: CaptureResult[] = [];
  const jobs = Math.max(1, Number(opt('--jobs') ?? 6));
  const queue = fixtures.flatMap((fx) => themes.map((theme) => ({ fx, theme })));
  const one = async ({ fx, theme }: { fx: Fixture; theme: number }) => {
    const viewport = fx.viewport ?? { width: 1280, height: 800 };
    const session = await bootV1(browser, port, viewport, dpr);
    try {
      const composition = {
        ZoomLevel: 1,
        DragOffset: { x: 0, y: 0 },
        Version: '1.0.12',
        Parent: '',
        ...fx.composition,
        ColorThemeNo: theme,
      };
      const loaded = await loadComposition(session, composition);
      await session.advance(fx.settleMs ?? 2500);
      if (fx.hideLoading) {
        await session.page.evaluate(() => {
          if (window.App) window.App.AnimationsLayer.ActiveBlocks = [];
        });
        await session.advance(100); // let a frame redraw without the overlay
      }
      if (fx.pinRandom !== undefined) {
        await session.page.evaluate((pinned) => {
          Math.random = () => pinned;
        }, fx.pinRandom);
        await session.advance(100);
      }
      await session.page.evaluate(() => {
        if (window.App) window.App.MainScene.IsPaused = true;
      });
      const stage = await stageInfo(session);
      const name =
        (themes.length > 1 || theme !== 0 ? `${fx.name}.theme${theme}` : fx.name) +
        (dpr !== 1 ? `@${dpr}x` : '');
      const png = join(out, `${name}.png`);
      const screenshot = await session.page.screenshot({ path: png });
      results.push({
        name,
        png,
        fixture: fx.name,
        composition,
        blocks: loaded,
        viewport,
        dpr,
        theme,
        pinRandom: fx.pinRandom,
        sha256: createHash('sha256').update(screenshot).digest('hex'),
        stage,
        errors: session.errors,
      });
      const errorNote = session.errors.length ? `, ${session.errors.length} page errors` : '';
      console.error(`captured ${png} (${loaded} blocks${errorNote})`);
    } finally {
      await session.close();
    }
  };
  try {
    // Each capture is its own browser context on virtual time, so captures can run concurrently.
    await Promise.all(
      Array.from({ length: Math.min(jobs, queue.length) }, async () => {
        for (let job; (job = queue.shift());) await one(job);
      }),
    );
  } finally {
    await browser.close();
    server.close();
  }
  const manifestPath = join(out, 'manifest.json');
  const prev = existsSync(manifestPath)
    ? ((JSON.parse(readFileSync(manifestPath, 'utf8')) as { results?: CaptureResult[] }).results ??
      [])
    : [];
  const merged = [
    ...prev.filter((old) => !results.some((result) => result.name === old.name)),
    ...results,
  ].sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(manifestPath, JSON.stringify({ v1Sha: V1_SHA, results: merged }, null, 2) + '\n');
  console.log(
    JSON.stringify({
      out,
      captured: results.length,
      withErrors: results.filter((result) => result.errors.length).length,
    }),
  );
}
