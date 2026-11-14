// bd visual — v2 stage vs v1 reference screenshots (SPEC-VISUAL-V1-PARITY) and the UI-0005 renderer bake-off.
//   pnpm bd visual diff [--renderer baked|canvas|msaa|ss2] [--dpr 1,2] [--only name,...] [--save-all]
//   pnpm bd visual bakeoff        diff all four renderers + frame-time benchmark → docs/engineering/renderer-bakeoff.md
// Requires `pnpm web:build`. Compares the region covering blocks, overlays and lines (v1 chrome is out of scope).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser } from 'playwright';
import { serveDist } from '../../tests/e2e/serve.ts';

const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const REF = 'tests/visual/reference/v1';
const OUT = 'tests/visual/output/v2-diff';
const thresholds = JSON.parse(readFileSync('tests/visual/thresholds.json', 'utf8'));

async function diff(browser: Browser, url: string, renderer: string, dprs: number[], only?: string[], saveAll = false, full = false) {
  const { PNG } = await import('pngjs');
  const pixelmatch = (await import('pixelmatch')).default;
  const refs = JSON.parse(readFileSync(join(REF, 'manifest.json'), 'utf8')).results
    .filter((r: any) => r.blocks > 0 && dprs.includes(r.dpr) && (!only || only.some(o => r.name.includes(o))));
  mkdirSync(OUT, { recursive: true });
  const results: any[] = [];
  for (const r of refs) {
    const page = await browser.newPage({ viewport: r.viewport, deviceScaleFactor: r.dpr });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${url}/visual.html`);
    await page.waitForFunction(() => document.title.includes('(ready)'));
    const info = await page.evaluate(i => (window as any).renderFixture(i), { composition: r.composition, starPos: r.stage.blocks.filter((b: any) => b.starPos), renderer, beamJitter: r.pinRandom ?? 0.5, chrome: full });
    const shot = PNG.sync.read(await page.screenshot());
    await page.close();
    const ref = PNG.sync.read(readFileSync(r.png));
    const t = { ...thresholds.default, ...(thresholds.overrides?.[r.fixture] ?? {}) };
    const pad = 4 * r.dpr;
    // --full: the whole screenshot (v1 chrome included); otherwise the region covering blocks, overlays, lines, beams.
    const x0 = full ? 0 : Math.max(0, Math.floor(info.roi[0]) - pad), y0 = full ? 0 : Math.max(0, Math.floor(info.roi[1]) - pad);
    const x1 = full ? ref.width : Math.min(ref.width, Math.ceil(info.roi[2]) + pad), y1 = full ? ref.height : Math.min(ref.height, Math.ceil(info.roi[3]) + pad);
    const w = x1 - x0, h = y1 - y0;
    const crop = (img: any) => { const o = Buffer.alloc(w * h * 4); for (let y = 0; y < h; y++) img.data.copy(o, y * w * 4, ((y0 + y) * img.width + x0) * 4, ((y0 + y) * img.width + x1) * 4); return o; };
    const a = crop(shot), b = crop(ref);
    const d = new PNG({ width: w, height: h });
    const diffPx = pixelmatch(a, b, d.data, w, h, { threshold: t.pixelThreshold, includeAA: !t.antialiasAware });
    let exact = 0, maxDelta = 0;
    for (let i = 0; i < a.length; i += 4) {
      const dd = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      if (dd) { exact++; maxDelta = Math.max(maxDelta, dd); }
    }
    const ratio = diffPx / (w * h), pass = ratio <= t.maxDiffPixelRatio && errors.length === 0;
    if (!pass || saveAll) {
      writeFileSync(join(OUT, `${r.name}.${renderer}.v2.png`), PNG.sync.write(shot));
      writeFileSync(join(OUT, `${r.name}.${renderer}.diff.png`), PNG.sync.write(d));
    }
    results.push({ name: r.name, pass, ratio: +ratio.toFixed(5), exactRatio: +(exact / (w * h)).toFixed(5), maxDelta, connections: info.connections, errors });
  }
  return results;
}

const summarize = (renderer: string, results: any[]) => ({
  renderer, checked: results.length, passed: results.filter(r => r.pass).length, identical: results.filter(r => r.exactRatio === 0).length,
  meanRatio: +(results.reduce((s, r) => s + r.ratio, 0) / Math.max(1, results.length)).toFixed(5),
  maxDelta: Math.max(0, ...results.map(r => r.maxDelta)),
  worst: results.slice().sort((a, b) => b.ratio - a.ratio || b.maxDelta - a.maxDelta)[0] ?? null,
});

const cmd = args[0];
const { url, server } = await serveDist();
const browser = await chromium.launch();
let failed = false;
try {
  const dprs = (opt('--dpr') ?? '1,2').split(',').map(Number);
  if (cmd === 'diff') {
    const renderer = opt('--renderer') ?? 'canvas';
    const results = await diff(browser, url, renderer, dprs, opt('--only')?.split(','), args.includes('--save-all'), args.includes('--full'));
    for (const r of results.filter(r => !r.pass)) console.error(`fail: ${r.name} ratio=${r.ratio} exact=${r.exactRatio}${r.errors.length ? ' errors=' + r.errors.join(';') : ''}`);
    console.log(JSON.stringify(summarize(renderer, results)));
    failed = results.some(r => !r.pass);
  } else if (cmd === 'bakeoff') {
    const rows: any[] = [];
    for (const renderer of ['baked', 'canvas', 'msaa', 'ss2']) {
      const s = summarize(renderer, await diff(browser, url, renderer, dprs));
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
      await page.goto(`${url}/visual.html`);
      await page.waitForFunction(() => document.title.includes('(ready)'));
      const perf = await page.evaluate(r => (window as any).benchmark(r), renderer);
      await page.close();
      rows.push({ ...s, ...perf });
      console.error(`${renderer}: ${JSON.stringify(rows.at(-1))}`);
    }
    const md = `# Renderer bake-off (UI-0005)\n\nGenerated by \`pnpm bd visual bakeoff\`. Diffs: v2 stage vs v1 reference screenshots (${rows[0].checked} scenes, 1x + 2x DPR), ` +
      `region covering blocks/overlays/lines, threshold ${thresholds.default.maxDiffPixelRatio * 100}% (pixelmatch ${thresholds.default.pixelThreshold}). ` +
      `Benchmark: 100 blocks (5 moved per frame) + 2000 particles at 1280×800@2x, headless Chromium (software GL, so absolute times are pessimistic; compare relatively).\n\n` +
      `| Renderer | Pass | Pixel-identical | Mean diff | Max channel Δ | Worst | Median frame | p95 frame |\n|---|---|---|---|---|---|---|---|\n` +
      rows.map(r => `| ${r.renderer} | ${r.passed}/${r.checked} | ${r.identical}/${r.checked} | ${(r.meanRatio * 100).toFixed(3)}% | ${r.maxDelta} | ${r.worst ? `${(r.worst.ratio * 100).toFixed(2)}% (${r.worst.name})` : '-'} | ${r.medianMs} ms | ${r.p95Ms} ms |`).join('\n') + '\n';
    writeFileSync('docs/engineering/renderer-bakeoff.md', md);
    console.log(JSON.stringify(rows.map(({ worst, ...r }) => r)));
  } else { console.error('usage: bd visual diff [--renderer baked|canvas|msaa|ss2] [--dpr 1,2] [--only a,b] [--save-all] | bakeoff'); process.exitCode = 2; }
} finally { await browser.close(); server.close(); }
if (failed) process.exit(1);
