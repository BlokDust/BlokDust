// bd ui — interactive v1 UI states as black-box references (CHG-0002 1.8–1.10, SPEC-VISUAL-V1-PARITY).
//   pnpm bd ui capture [--only a,b]   play each fixture's pointer actions in v1 (virtual clock), screenshot the settled state
//   pnpm bd ui diff [--only a,b] [--save-all]
//                                    play the same actions in the real v2 app (index.html?v1=…), screenshot, pixel-diff
// Fixtures: tests/visual/fixtures/ui/*.json = { composition, viewport?, actions: [{ click | move | down | up: [x, y] }
// | { wait: ms } | { keyDown | keyUp: 'Alt' } | { type: 'text' } | { press: 'Enter' }], settleMs?, search? }, coordinates in css
// px. `search: [{ title, user }]` mocks the sample search on both sides: v1 gets a stub SoundCloud SDK returning those
// tracks, v2 gets the same titles from its Freesound API (CHG-0003 R15). Same input, same UI code, same pixels expected.
// `v2Actions` (+ `v2Reason`): v2 plays these instead, when it reaches the same v1 state another way (CHG-0005).
// `retired`: v2 no longer has this v1 state on purpose (the reason, with the owner decision); `diff` lists it as
// retired and does not compare it. The v1 reference stays.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { chromium, type Page } from 'playwright';
import { serveDist } from '../../tests/e2e/serve.ts';
import { bootV1, loadComposition, randomPort, serve, V1_SHA } from '../v1/lib.ts';

const FIX = 'tests/visual/fixtures/ui',
  REF = 'tests/visual/reference/v1/ui',
  OUT = 'tests/visual/output/ui';
type Action = {
  click?: [number, number];
  move?: [number, number];
  down?: [number, number];
  up?: [number, number];
  wait?: number;
  keyDown?: string;
  keyUp?: string;
  type?: string;
  press?: string;
};
type SearchResult = { title: string; user: string };
interface Fixture {
  name: string;
  description?: string;
  viewport?: { width: number; height: number };
  composition: any;
  actions: Action[];
  settleMs?: number;
  maxDiffPixelRatio?: number;
  search?: SearchResult[];
  /** Played in v2 instead of `actions` when v2 reaches the same state another way (reason in `v2Reason`). */
  v2Actions?: Action[];
  v2Reason?: string;
  /** v2 no longer has this state, on purpose: why (owner decision). Not diffed. */
  retired?: string;
  /** css-px rects excluded from the diff (intentional differences, each with a reason in `maskReason`). */
  mask?: [number, number, number, number][];
  maskReason?: string;
}

const args = process.argv.slice(2);
const opt = (k: string) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};
const fixtures = (): Fixture[] =>
  readdirSync(FIX)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ name: basename(f, '.json'), ...JSON.parse(readFileSync(join(FIX, f), 'utf8')) }))
    .filter((f) => !opt('--only') || opt('--only')!.split(',').includes(f.name));
const fullComposition = (c: any) => ({
  ZoomLevel: 1,
  DragOffset: { x: 0, y: 0 },
  Version: '1.0.12',
  Parent: '',
  ColorThemeNo: 0,
  ...c,
});

async function play(page: Page, actions: Action[], wait: (ms: number) => Promise<void>) {
  for (const a of actions) {
    if (a.keyDown) {
      await page.keyboard.down(a.keyDown);
      await wait(30);
    }
    if (a.move) {
      await page.mouse.move(...a.move, { steps: 4 });
      await wait(30);
    }
    if (a.down) {
      await page.mouse.move(...a.down);
      await page.mouse.down();
      await wait(30);
    }
    if (a.up) {
      await page.mouse.move(...a.up, { steps: 4 });
      await page.mouse.up();
      await wait(30);
    }
    if (a.click) {
      await page.mouse.move(...a.click);
      await page.mouse.down();
      await wait(40);
      await page.mouse.up();
      await wait(30);
    }
    if (a.keyUp) {
      await page.keyboard.up(a.keyUp);
      await wait(30);
    }
    if (a.type) {
      for (const ch of a.type) {
        await page.keyboard.type(ch);
        await wait(20);
      }
    }
    if (a.press) {
      await page.keyboard.press(a.press);
      await wait(30);
    }
    if (a.wait) await wait(a.wait);
  }
}

/** v1 side: a stand-in for SoundCloud's SDK (connect.soundcloud.com, gone) whose SC.get returns the fixture's tracks. */
async function mockSoundCloud(page: Page, results: SearchResult[]): Promise<void> {
  const tracks = results.map((r, i) => ({
    id: i + 1,
    title: r.title,
    user: { username: r.user },
    uri: `https://api.soundcloud.com/tracks/${i + 1}`,
    permalink_url: `https://soundcloud.com/x/${i + 1}`,
    streamable: true,
    sharing: 'public',
  }));
  const sdk = `window.SC = { initialize: function () {}, get: function () { return Promise.resolve(${JSON.stringify(tracks)}); } };`;
  await page.route('https://connect.soundcloud.com/**', (r) =>
    r.fulfill({ status: 200, contentType: 'text/javascript', body: sdk }),
  );
}
/** v2 side: the Worker's Freesound API answering with the same titles (and audio for any default/preview fetch). */
async function mockFreesound(page: Page, results: SearchResult[]): Promise<void> {
  const sounds = results.map((r, i) => ({
    id: i + 1,
    name: r.title,
    username: r.user,
    license: 'CC0',
    licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/',
    duration: 1,
    preview: `https://cdn.freesound.org/previews/0/${i + 1}.wav`,
    url: `https://freesound.org/s/${i + 1}/`,
  }));
  await page.route('**/api/freesound/search**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ count: sounds.length, results: sounds }),
    }),
  );
  await page.route('https://cdn.freesound.org/**', (r) => r.abort()); // no audio: v1's track loads fail too
}

async function capture() {
  mkdirSync(REF, { recursive: true });
  const port = randomPort(),
    server = await serve(port),
    browser = await chromium.launch();
  const results: any[] = [];
  try {
    for (const fx of fixtures()) {
      const s = await bootV1(
        browser,
        port,
        fx.viewport ?? { width: 1280, height: 800 },
        1,
        undefined,
        fx.search ? (page) => mockSoundCloud(page, fx.search!) : undefined,
      );
      try {
        await loadComposition(s, fullComposition(fx.composition));
        await s.advance(3000); // master fade-in, Play() at 2.4 s, header/CreateNew tweens
        await play(s.page, fx.actions, (ms) => s.advance(ms));
        await s.advance(fx.settleMs ?? 1500);
        const png = join(REF, `${fx.name}.png`);
        await s.page.screenshot({ path: png });
        results.push({ name: fx.name, png, errors: s.errors });
        console.error(
          `captured ${png}${s.errors.length ? ` (page errors: ${s.errors.join('; ')})` : ''}`,
        );
      } finally {
        await s.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  // Merge with earlier captures (a subset capture keeps the other references' entries).
  const prev = existsSync(join(REF, 'manifest.json'))
    ? (JSON.parse(readFileSync(join(REF, 'manifest.json'), 'utf8')).results as any[])
    : [];
  const merged = [...prev.filter((p) => !results.some((r) => r.name === p.name)), ...results].sort(
    (a, b) => a.name.localeCompare(b.name),
  );
  writeFileSync(
    join(REF, 'manifest.json'),
    JSON.stringify({ v1Sha: V1_SHA, results: merged }, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({
      captured: results.length,
      withErrors: results.filter((r) => r.errors.length).length,
    }),
  );
}

async function diff() {
  const { PNG } = await import('pngjs');
  const pixelmatch = (await import('pixelmatch')).default;
  const thresholds = JSON.parse(readFileSync('tests/visual/thresholds.json', 'utf8')).default;
  mkdirSync(OUT, { recursive: true });
  const { url, server } = await serveDist();
  const browser = await chromium.launch();
  const rows: any[] = [],
    retired: { name: string; reason: string }[] = [];
  try {
    for (const fx of fixtures()) {
      const ref = join(REF, `${fx.name}.png`);
      if (!existsSync(ref)) {
        rows.push({ name: fx.name, pass: false, error: 'no v1 reference: run bd ui capture' });
        continue;
      }
      if (fx.retired) {
        retired.push({ name: fx.name, reason: fx.retired });
        console.error(`retired ${fx.name}: ${fx.retired}`);
        continue;
      }
      const page = await browser.newPage({
        viewport: fx.viewport ?? { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      });
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      if (fx.search) await mockFreesound(page, fx.search);
      await page.goto(
        `${url}/index.html?v1=${encodeURIComponent(JSON.stringify(fullComposition(fx.composition)))}`,
      );
      await page.waitForFunction(() => (window as any).__bd_probe);
      await page.click('#start'); // start the engine: connections and power come from it, as in v1
      await page.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10, null, {
        timeout: 15000,
      });
      await page.waitForTimeout(1200);
      await play(page, fx.v2Actions ?? fx.actions, (ms) => page.waitForTimeout(ms));
      await page.waitForTimeout(fx.settleMs ?? 1500);
      await page.mouse.move(-10, -10).catch(() => {});
      const shot = PNG.sync.read(await page.screenshot());
      const want = PNG.sync.read(readFileSync(ref));
      const { width, height } = want;
      for (const [mx, my, mw, mh] of fx.mask ?? [])
        for (let y = my; y < my + mh; y++)
          for (let x = mx; x < mx + mw; x++) {
            const i = (y * width + x) * 4;
            for (let k = 0; k < 4; k++) shot.data[i + k] = want.data[i + k];
          }
      const d = new PNG({ width, height });
      const n = pixelmatch(want.data, shot.data, d.data, width, height, {
        threshold: thresholds.pixelThreshold,
      });
      const ratio = n / (width * height),
        limit = fx.maxDiffPixelRatio ?? thresholds.maxDiffPixelRatio;
      const pass = ratio <= limit && errors.length === 0;
      if (!pass || args.includes('--save-all')) {
        writeFileSync(join(OUT, `${fx.name}.v2.png`), PNG.sync.write(shot));
        writeFileSync(join(OUT, `${fx.name}.diff.png`), PNG.sync.write(d));
      }
      rows.push({ name: fx.name, pass, ratio: +ratio.toFixed(5), limit, errors });
      console.error(
        `${pass ? 'pass' : 'FAIL'} ${fx.name} ${(ratio * 100).toFixed(3)}%${errors.length ? ` errors: ${errors.join('; ')}` : ''}`,
      );
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(
    JSON.stringify({
      checked: rows.length,
      passed: rows.filter((r) => r.pass).length,
      failed: rows.filter((r) => !r.pass).map((r) => r.name),
      retired,
      rows,
    }),
  );
  if (rows.some((r) => !r.pass)) process.exitCode = 1;
}

if (args[0] === 'capture') await capture();
else if (args[0] === 'diff') await diff();
else {
  console.error('usage: bd ui capture [--only a,b] | diff [--only a,b] [--save-all]');
  process.exitCode = 2;
}
