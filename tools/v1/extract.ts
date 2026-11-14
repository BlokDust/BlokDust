// bd v1 extract — derive draft block manifests + palettes from the running v1 app (authoritative, not guessed).
// Runtime: instantiate each block, record Defaults/Params/Outline/OptionsForm, and intercept BlockSprites drawing
// calls to capture exact polygons in grid units with palette indices.
// Source: pull the raw UI value expressions from v1's TypeScript so slider↔param transforms can be reviewed.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { V1_BLOCKS, V1_DIR, V1_SHA, bootV1, randomPort, serve } from './lib.ts';

const CATEGORY_PREFIX: Record<string, string> = { source: 'source', effect: 'fx', power: 'power', interaction: 'input' };
const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();
export const v2Id = (category: string, type: string) =>
  `${CATEGORY_PREFIX[category]}.${({ ToneSource: 'tone', ParticleEmitter: 'emitter', MIDIController: 'midi-controller', EQ: 'eq' } as Record<string, string>)[type] ?? kebab(type)}`;

function kindOf(type: string, chain: string[]): string {
  if (type === 'Void') return 'void';
  if (chain.includes('Controller') || chain.includes('Keyboard')) return 'controller';
  if (chain.includes('PowerSource')) return 'power-source';
  if (chain.includes('Logic')) return 'logic';
  if (chain.includes('PowerEffect')) return 'power-effect';
  if (chain.includes('PreEffect')) return 'pre-effect';
  if (chain.includes('PostEffect')) return 'post-effect';
  if (chain.includes('Source')) return 'audio-source';
  return 'unknown';
}

function findSource(type: string): { path: string; text: string } | null {
  const walk = (d: string): string[] => readdirSync(d).flatMap(f => statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]);
  for (const f of walk(join(V1_DIR, 'app/Blocks')).filter(f => f.endsWith('.ts'))) {
    const text = readFileSync(f, 'utf8');
    if (new RegExp(`export class ${type}\\b`).test(text)) return { path: f.replace(`${V1_DIR}/`, ''), text };
  }
  return null;
}

/** For each `"setting" : "x"` in an OptionsForm, the raw `"value" : <expr>` inside the same entry
 *  (i.e. before the next `"setting"`), or nothing if that entry has no value. */
function uiValueExprs(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const settings = [...text.matchAll(/"setting"\s*:\s*"(\w*)"/g)];
  settings.forEach((m, i) => {
    const key = m[1];
    if (!key || key in out) return;
    const end = i + 1 < settings.length ? settings[i + 1].index! : text.length;
    const v = /"value"\s*:\s*([^,\n]+)/.exec(text.slice(m.index!, end));
    if (v) out[key] = v[1].trim();
  });
  return out;
}

const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
/** Pretty JSON with coordinate pairs kept on one line: [[0, -1], [1, -1]]. */
export const compactJson = (v: unknown) =>
  JSON.stringify(v, null, 2).replace(/\[\s*(-?[\d.]+),\s*(-?[\d.]+)\s*\]/g, '[$1, $2]') + '\n';

export async function extract(args: string[]) {
  const { chromium } = await import('playwright');
  const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'blocks';
  const port = randomPort();
  const server = await serve(port);
  const browser = await chromium.launch();
  let runtime: any;
  let palettes: any[] = [];
  try {
    const s = await bootV1(browser, port, { width: 1280, height: 800 }, 1);
    runtime = await s.page.evaluate((groups: Record<string, string[]>) => {
      const App = (window as any).App;
      const W = window as any;
      const Point = W.etch.primitives.Point;
      const S = App.BlockSprites;
      const safe = (v: any, depth = 0): any => {
        if (v === null || v === undefined || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
        if (typeof v === 'function') return `[fn ${v.name || 'anonymous'}]`;
        if (depth > 4) return '[depth]';
        if (Array.isArray(v)) return v.slice(0, 50).map(x => safe(x, depth + 1));
        if (typeof v === 'object') {
          const ctor = v.constructor?.name ?? '';
          if (ctor === 'Point' || ('x' in v && 'y' in v && Object.keys(v).length <= 3)) return { x: v.x, y: v.y };
          if (/^(Tone|Audio|Gain|Oscillator)/.test(ctor) || 'context' in v) return `[${ctor}]`;
          const o: any = {};
          for (const k of Object.keys(v)) o[k] = safe(v[k], depth + 1);
          return o;
        }
        return String(v);
      };
      const recordSprite = (name: string, scaled: boolean, pos2?: any) => {
        const polys: any[] = []; let cur: any = null; let color: number | null = null;
        const saved = { fill: App.FillColor, m: S.DrawMoveTo, l: S.DrawLineTo, fm: S.DrawFloatMoveTo, fl: S.DrawFloatLineTo };
        App.FillColor = (_ctx: any, col: any) => { color = App.Palette.indexOf(col); };
        const pt = (space: string) => (x: number, y: number) => { cur ??= { space, points: [] }; cur.space = space; cur.points.push([x, y]); };
        S.DrawMoveTo = pt('grid'); S.DrawLineTo = pt('grid'); S.DrawFloatMoveTo = pt('unit'); S.DrawFloatLineTo = pt('unit');
        const ctx: any = { beginPath() { cur = null; }, closePath() {}, moveTo() {}, lineTo() {}, stroke() {},
          fill() { if (cur) polys.push({ palette: color, space: cur.space, points: cur.points }); cur = null; } };
        try { S.DrawSprite({ Ctx: ctx }, new Point(0, 0), scaled, name.toLowerCase(), pos2); }
        finally { App.FillColor = saved.fill; S.DrawMoveTo = saved.m; S.DrawLineTo = saved.l; S.DrawFloatMoveTo = saved.fm; S.DrawFloatLineTo = saved.fl; }
        return { polys, xOffset: S._XOffset, yOffset: S._YOffset };
      };
      const findL10n = (blockName: string) => {
        for (const [cat, v] of Object.entries<any>(App.L10n.Blocks)) for (const [key, b] of Object.entries<any>(v.Blocks ?? {}))
          if (b.name === blockName) return { category: cat, key, name: b.name, description: b.description };
        return null;
      };
      // Screen-space UI that v1 draws attached to certain blocks (does not scale with zoom).
      const recordOverlay = (drawFn: (ctx: any) => void) => {
        const layers: any[] = []; let pts: number[][] = []; let color: number | null = null;
        const saved = App.FillColor;
        App.FillColor = (_ctx: any, col: any) => { color = App.Palette.indexOf(col); };
        const ctx: any = { globalAlpha: 1, beginPath() { pts = []; }, closePath() {},
          moveTo(x: number, y: number) { pts.push([x, y]); }, lineTo(x: number, y: number) { pts.push([x, y]); },
          fill() { layers.push({ palette: color, alpha: ctx.globalAlpha, points: pts.map(([x, y]) => [x / App.GridSize, y / App.GridSize]) }); } };
        try { drawFn(ctx); } finally { App.FillColor = saved; }
        return layers;
      };
      const overlaysFor = (type: string) => {
        if (type !== 'Recorder') return [];
        const panel = App.MainScene._RecorderPanel;
        const draw = (rec: boolean, hover: boolean) => recordOverlay(ctx => panel.DrawPanel.call(Object.defineProperty(Object.create(panel), 'Ctx', { value: ctx }), 0, 0, rec, hover));
        return [{ name: 'recordButton', source: 'app/UI/RecorderPanel.ts', scale: 'screen', order: 'afterBlocks',
          states: { idle: draw(false, false), hover: draw(false, true), recording: draw(true, false) },
          roles: { txt: App.ThemeManager.Txt } }];
      };
      const out: any = { gridSize: App.GridSize, unit: App.Unit, blocks: [] as any[] };
      for (const [category, types] of Object.entries(groups)) for (const type of types) {
        const errors: string[] = [];
        let b: any;
        try {
          b = App.BlockCreator.GetBlock(type);
          b.Id = 900000; b.Position = new Point(0, 0); b.LastPosition = new Point(0, 0);
          b.Init(App.MainScene);
          b.UpdateOptionsForm?.();
        } catch (e: any) { errors.push(`init: ${e.message}`); }
        const chain: string[] = [];
        for (let p = b && Object.getPrototypeOf(b); p && p.constructor && p.constructor !== Object; p = Object.getPrototypeOf(p)) chain.push(p.constructor.name);
        const name = b?.BlockName ?? type;
        let sprite: any = null, menuSprite: any = null;
        const SENTINEL = { x: 1000, y: 2000 }; // Void draws a star pixel at a random per-block position (pos2)
        try { sprite = recordSprite(name, true, new Point(SENTINEL.x, SENTINEL.y)); } catch (e: any) { errors.push(`sprite: ${e.message}`); }
        try { menuSprite = recordSprite(name, false, new Point(SENTINEL.x, SENTINEL.y)); } catch (e: any) { errors.push(`menuSprite: ${e.message}`); }
        out.blocks.push({
          category, type, chain, name, l10n: findL10n(name),
          defaults: safe(b?.Defaults), params: safe(b?.Params),
          outline: (b?.Outline ?? []).map((p: any) => [p.x, p.y]),
          catchment: b?.CatchmentArea ?? null,
          optionsForm: safe(b?.OptionsForm),
          sprite, menuOffset: menuSprite ? { x: menuSprite.xOffset, y: menuSprite.yOffset } : null,
          overlays: overlaysFor(type),
          errors,
        });
      }
      return out;
    }, V1_BLOCKS);

    // Palettes for all themes, including role indices (txt/menu/options/power are appended palette entries).
    const themeCount: number = await s.page.evaluate(() => (window as any).App.ThemeManager.Themes.length);
    for (let t = 0; t < themeCount; t++) {
      await s.page.evaluate((n) => { (window as any).App.ThemeManager.LoadTheme(n, false, true); }, t);
      for (let i = 0; i < 200 && !(await s.page.evaluate(() => (window as any).App.ThemeManager.Loaded)); i++) {
        await s.advance(50); await s.page.waitForTimeout(5);
      }
      await s.advance(1500); // 800 ms colour tween
      palettes.push(await s.page.evaluate((n) => {
        const App = (window as any).App; const T = App.ThemeManager; const th = T.Themes[n];
        return { index: n, name: th.Name ?? th.name ?? null, url: th.PaletteURL ?? null,
          colors: App.Palette.map((c: any) => App.ColorManager.ColorString(c)),
          roles: { txt: T.Txt, menu: T.MenuOrder, options: T.OptionsOrder, power: T.Power } };
      }, t));
    }
    if (s.errors.length) console.error(`page errors during extract: ${s.errors.length} (first: ${s.errors[0]})`);
    await s.close();
  } finally { await browser.close(); server.close(); }

  // ---- write manifests ----
  const written: string[] = [], skipped: string[] = [], review: Record<string, string[]> = {};
  const UNIT_PER_GRID = runtime.gridSize / runtime.unit; // 15
  for (const b of runtime.blocks) {
    const id = v2Id(b.category, b.type);
    const notes: string[] = [...b.errors];
    const src = findSource(b.type);
    const exprs = src ? uiValueExprs(src.text) : {};
    const layers = (b.sprite?.polys ?? []).map((p: any) => {
      let pts: number[][] = p.points; const layer: any = { palette: p.palette };
      if (p.space === 'unit') {
        if (pts[0]?.[0] >= 999 && pts[0]?.[1] >= 1999) { layer.anchor = 'randomStar'; pts = pts.map(([x, y]) => [x - 1000, y - 2000]); }
        // Keep v1 units (1 grid cell = 15 units) so coordinates stay exact; renderers divide by unitsPerGrid.
        layer.kind = 'pixel'; layer.units = 'unit';
      }
      layer.points = pts.map(([x, y]) => [r4(x), r4(y)]);
      return layer;
    });
    if (!layers.length) notes.push('no sprite polygons recorded');
    if (layers.some((l: any) => l.palette < 0)) notes.push('fill colour not found in App.Palette');
    const keys = [...new Set([...Object.keys(b.defaults ?? {}), ...Object.keys(exprs)])];
    const sliders: Record<string, any> = {};
    const walkForm = (o: any) => {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) { o.forEach(walkForm); return; }
      if (typeof o.setting === 'string' && o.setting) sliders[o.setting] = { type: o.type ?? null, label: o.name ?? null, props: o.props ?? null };
      for (const v of Object.values(o)) walkForm(v);
    };
    walkForm(b.optionsForm?.parameters ?? b.optionsForm);
    const params = keys.map(k => {
      const expr = exprs[k];
      const ui = sliders[k];
      const direct = !expr || expr === `this.Params.${k}`;
      if (!direct) notes.push(`param '${k}': UI value is \`${expr}\` (non-identity transform; define real units)`);
      return { key: k, default: b.defaults?.[k] ?? null, unit: null,
        v1: { ui: ui ?? null, uiValueExpr: expr ?? null } };
    });
    notes.push('params: units/ranges in real units not yet defined (draft)');
    const manifest = {
      $schema: '../schema/block.schema.json',
      id, draft: true,
      category: b.category, kind: kindOf(b.type, b.chain),
      name: b.l10n?.name ?? b.name, description: b.l10n?.description ?? '',
      v1: { type: b.type, class: b.chain, l10nKey: b.l10n?.key ?? null, source: src?.path ?? null, sha: V1_SHA },
      connection: b.catchment != null ? { catchment: b.catchment } : null,
      geometry: {
        units: 'grid',
        unitsPerGrid: UNIT_PER_GRID,
        layers,
        outline: b.outline,
        menuOffset: b.menuOffset ? [r4(b.menuOffset.x / runtime.gridSize), r4(b.menuOffset.y / runtime.gridSize)] : [0, 0],
        ...(b.overlays.length ? { overlays: b.overlays.map((o: any) => ({ ...o,
          states: Object.fromEntries(Object.entries(o.states).map(([k, ls]: [string, any]) => [k, ls.map((l: any) => ({
            palette: l.palette, ...(l.alpha !== 1 ? { alpha: r4(l.alpha) } : {}), points: l.points.map(([x, y]: number[]) => [r4(x), r4(y)]) }))])) })) } : {}),
      },
      params,
      review: notes,
    };
    const dir = join(outDir, b.category);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${id}.block.json`);
    if (existsSync(file) && JSON.parse(readFileSync(file, 'utf8')).draft === false) { skipped.push(file); continue; }
    writeFileSync(file, compactJson(manifest));
    written.push(file); review[id] = notes;
  }
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'v1-palettes.json'), JSON.stringify({ v1Sha: V1_SHA, themes: palettes }, null, 2) + '\n');
  console.log(JSON.stringify({ written: written.length, skipped, palettes: palettes.length,
    withIssues: Object.entries(review).filter(([, n]) => n.length > 1).map(([id, n]) => `${id}(${n.length - 1})`) }));
}
