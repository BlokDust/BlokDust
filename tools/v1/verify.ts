// bd v1 verify — prove extracted block manifests reproduce v1's pixels.
// Re-renders each per-block reference scene from blocks/**/*.block.json with Canvas2D, using the exact stage
// metrics and palette recorded at capture time, then diffs the block's bounding box against the v1 screenshot.
// This validates the extraction AND is an early measurement for UI-0005 (Canvas2D-baked sprites).
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface Layer {
  palette: number;
  points: number[][];
  units?: 'unit';
  anchor?: 'randomStar';
}

export function loadManifests(dir = 'blocks'): Map<string, any> {
  const byV1 = new Map<string, any>();
  const walk = (d: string): string[] =>
    readdirSync(d).flatMap((f) =>
      statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)],
    );
  for (const f of walk(dir).filter((f) => f.endsWith('.block.json'))) {
    const m = JSON.parse(readFileSync(f, 'utf8'));
    if (m.v1?.type) byV1.set(m.v1.type, m);
  }
  return byV1;
}

/** Transform a manifest's layers into canvas-pixel polygons for a block at grid position (bx, by). */
export function toPixels(
  geometry: any,
  stage: any,
  block: { x: number; y: number; starPos?: { x: number; y: number } },
) {
  const upg = geometry.unitsPerGrid ?? 15;
  const ox = stage.c.x + stage.scaledDragOffset.x * stage.unit;
  const oy = stage.c.y + stage.scaledDragOffset.y * stage.unit;
  return (geometry.layers as Layer[]).map((layer) => ({
    fill: stage.palette[layer.palette],
    points: layer.points.map(([x, y]) => {
      let gx = x,
        gy = y;
      if (layer.units === 'unit') {
        const ax = layer.anchor === 'randomStar' ? (block.starPos?.x ?? 0) : 0;
        const ay = layer.anchor === 'randomStar' ? (block.starPos?.y ?? 0) : 0;
        gx = (x + ax) / upg;
        gy = (y + ay) / upg;
      }
      return [
        ox + (block.x + gx) * stage.scaledGridSize,
        oy + (block.y + gy) * stage.scaledGridSize,
      ];
    }),
  }));
}

/** Screen-space overlays (e.g. Recorder's record button): anchored at the block, sized by the unscaled grid. */
export function overlayPixels(
  geometry: any,
  stage: any,
  block: { x: number; y: number },
  state: string,
) {
  const bx = stage.c.x + stage.scaledDragOffset.x * stage.unit + block.x * stage.scaledGridSize;
  const by = stage.c.y + stage.scaledDragOffset.y * stage.unit + block.y * stage.scaledGridSize;
  return (geometry.overlays ?? []).flatMap((o: any) =>
    (o.states[state] ?? []).map((l: any) => ({
      fill: stage.palette[l.palette],
      alpha: l.alpha ?? 1,
      points: l.points.map(([x, y]: number[]) => [
        bx + x * stage.gridSize,
        by + y * stage.gridSize,
      ]),
    })),
  );
}

export async function verify(args: string[]) {
  const { chromium } = await import('playwright');
  const { PNG } = await import('pngjs');
  const pixelmatch = (await import('pixelmatch')).default;
  const opt = (k: string) => {
    const i = args.indexOf(k);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const refDir = opt('--ref') ?? 'tests/visual/reference/v1';
  const outDir = opt('--out') ?? 'tests/visual/output/v1-verify';
  const dprs = (opt('--dpr') ?? '1,2').split(',').map(Number);
  const only = opt('--only')?.split(',');
  const thresholds = JSON.parse(readFileSync('tests/visual/thresholds.json', 'utf8'));
  const manifests = loadManifests(opt('--blocks') ?? 'blocks');
  const refs = JSON.parse(readFileSync(join(refDir, 'manifest.json'), 'utf8')).results.filter(
    (result: any) =>
      result.fixture?.startsWith('block-') &&
      dprs.includes(result.dpr) &&
      (!only || only.some((o) => result.name.includes(o))),
  );
  if (!refs.length)
    throw new Error(`no per-block references in ${refDir} (run: pnpm bd v1 capture --blocks)`);
  if (!refs[0].stage?.blocks)
    throw new Error('references lack stage metrics; recapture with the current tool');
  mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results: any[] = [];
  try {
    for (const r of refs) {
      const type = r.fixture.split('-').slice(2).join('-');
      const manifest = manifests.get(type);
      const t = { ...thresholds.default, ...(thresholds.overrides?.[r.fixture] ?? {}) };
      if (!manifest) {
        results.push({ name: r.name, status: 'missing-manifest' });
        continue;
      }
      const stage = r.stage;
      const placed = stage.blocks.filter((b: any) => b.type === type);
      const polys = [
        ...placed.flatMap((b: any) => toPixels(manifest.geometry, stage, b)),
        ...placed.flatMap((b: any) => overlayPixels(manifest.geometry, stage, b, 'idle')),
      ];
      const dataUrl: string = await page.evaluate(
        ({ w, h, bg, polys }) => {
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, w, h);
          for (const p of polys) {
            ctx.beginPath();
            p.points.forEach(([x, y]: number[], i: number) => {
              i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            });
            ctx.closePath();
            ctx.fillStyle = p.fill;
            ctx.globalAlpha = p.alpha ?? 1;
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          return canvas.toDataURL('image/png');
        },
        { w: stage.canvas.width, h: stage.canvas.height, bg: stage.palette[0], polys },
      );
      const v2 = PNG.sync.read(Buffer.from(dataUrl.split(',')[1], 'base64'));
      const ref = PNG.sync.read(readFileSync(r.png));
      if (v2.width !== ref.width || v2.height !== ref.height) {
        results.push({
          name: r.name,
          status: 'size-mismatch',
          v2: [v2.width, v2.height],
          ref: [ref.width, ref.height],
        });
        continue;
      }
      // Compare the block's bounding box (+ margin): the rest of the screenshot is chrome, not block pixels.
      const xs = polys.flatMap((poly: any) => poly.points.map((point: number[]) => point[0])),
        ys = polys.flatMap((poly: any) => poly.points.map((point: number[]) => point[1]));
      const pad = 4 * r.dpr;
      const x0 = Math.max(0, Math.floor(Math.min(...xs)) - pad),
        y0 = Math.max(0, Math.floor(Math.min(...ys)) - pad);
      const x1 = Math.min(ref.width, Math.ceil(Math.max(...xs)) + pad),
        y1 = Math.min(ref.height, Math.ceil(Math.max(...ys)) + pad);
      const w = x1 - x0,
        h = y1 - y0;
      const crop = (img: any) => {
        const bytes = Buffer.alloc(w * h * 4);
        for (let y = 0; y < h; y++)
          img.data.copy(
            bytes,
            y * w * 4,
            ((y0 + y) * img.width + x0) * 4,
            ((y0 + y) * img.width + x1) * 4,
          );
        return bytes;
      };
      const a = crop(v2),
        b = crop(ref);
      const diff = new PNG({ width: w, height: h });
      const diffPx = pixelmatch(a, b, diff.data, w, h, {
        threshold: t.pixelThreshold,
        includeAA: !t.antialiasAware,
      });
      let exact = 0;
      for (let i = 0; i < a.length; i += 4)
        if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) exact++;
      const ratio = diffPx / (w * h);
      const pass = ratio <= t.maxDiffPixelRatio;
      if (!pass || args.includes('--save-all')) {
        writeFileSync(join(outDir, `${r.name}.v2.png`), PNG.sync.write(v2));
        writeFileSync(join(outDir, `${r.name}.diff.png`), PNG.sync.write(diff));
      }
      results.push({
        name: r.name,
        id: manifest.id,
        status: pass ? 'pass' : 'fail',
        ratio: +ratio.toFixed(5),
        exactRatio: +(exact / (w * h)).toFixed(5),
        box: [x0, y0, w, h],
      });
    }
  } finally {
    await browser.close();
  }
  const failed = results.filter((result) => result.status !== 'pass');
  writeFileSync(join(outDir, 'summary.json'), JSON.stringify({ results }, null, 2) + '\n');
  for (const f of failed)
    console.error(`${f.status}: ${f.name}${f.ratio != null ? ` ratio=${f.ratio}` : ''}`);
  const worst = results
    .filter((result) => result.ratio != null)
    .sort((a, b) => b.ratio - a.ratio)[0];
  console.log(
    JSON.stringify({
      checked: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      identical: results.filter((result) => result.exactRatio === 0).length,
      worst: worst ? { name: worst.name, ratio: worst.ratio } : null,
    }),
  );
  if (failed.length) process.exit(1);
}
