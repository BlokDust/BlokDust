// bd v1 extract: draft block manifests + palettes from the running v1 (extract-runtime.ts), plus
// the raw UI value expressions from v1's TypeScript so slider↔param transforms can be reviewed.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  recordBlocks,
  recordPalettes,
  type RecordedBlock,
  type RecordedLayer,
  type RecordedPalette,
  type RecordedRuntime,
} from './extract-runtime.ts';
import { V1_BLOCKS, V1_DIR, V1_SHA, bootV1, randomPort, serve } from './lib.ts';

const CATEGORY_PREFIX: Record<string, string> = {
  source: 'source',
  effect: 'fx',
  power: 'power',
  interaction: 'input',
};
const kebab = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
const V2_NAMES: Record<string, string | undefined> = {
  ToneSource: 'tone',
  ParticleEmitter: 'emitter',
  MIDIController: 'midi-controller',
  EQ: 'eq',
};
export const v2Id = (category: string, type: string) =>
  `${CATEGORY_PREFIX[category]}.${V2_NAMES[type] ?? kebab(type)}`;

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
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) =>
      statSync(join(dir, entry)).isDirectory() ? walk(join(dir, entry)) : [join(dir, entry)],
    );
  for (const file of walk(join(V1_DIR, 'app/Blocks')).filter((path) => path.endsWith('.ts'))) {
    const text = readFileSync(file, 'utf8');
    if (new RegExp(`export class ${type}\\b`).test(text))
      return { path: file.replace(`${V1_DIR}/`, ''), text };
  }
  return null;
}

/** For each `"setting" : "x"` in an OptionsForm, the raw `"value" : <expr>` in the same entry
 *  (before the next `"setting"`), or nothing if that entry has no value. */
function uiValueExprs(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const settings = [...text.matchAll(/"setting"\s*:\s*"(\w*)"/g)];
  settings.forEach((match, i) => {
    const key = match[1];
    if (!key || key in out) return;
    const end = i + 1 < settings.length ? settings[i + 1].index : text.length;
    const value = /"value"\s*:\s*([^,\n]+)/.exec(text.slice(match.index, end));
    if (value) out[key] = value[1].trim();
  });
  return out;
}

const round4 = (value: number) => Math.round(value * 1e4) / 1e4;
/** Pretty JSON with coordinate pairs kept on one line: [[0, -1], [1, -1]]. */
export const compactJson = (value: unknown) =>
  JSON.stringify(value, null, 2).replace(/\[\s*(-?[\d.]+),\s*(-?[\d.]+)\s*\]/g, '[$1, $2]') + '\n';

interface ManifestLayer {
  palette: number | null;
  anchor?: 'randomStar';
  kind?: 'pixel';
  units?: 'unit';
  points: number[][];
}

interface SliderInfo {
  type: unknown;
  label: unknown;
  props: unknown;
}

/** The sliders an OptionsForm declares, by setting. */
function slidersOf(optionsForm: unknown): Record<string, SliderInfo | undefined> {
  const sliders: Record<string, SliderInfo | undefined> = {};
  const walkForm = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walkForm);
      return;
    }
    const entry = node as Record<string, unknown>;
    if (typeof entry.setting === 'string' && entry.setting)
      sliders[entry.setting] = {
        type: entry.type ?? null,
        label: entry.name ?? null,
        props: entry.props ?? null,
      };
    for (const value of Object.values(entry)) walkForm(value);
  };
  const form = optionsForm as { parameters?: unknown } | null | undefined;
  walkForm(form?.parameters ?? form);
  return sliders;
}

function spriteLayers(block: RecordedBlock): ManifestLayer[] {
  return (block.sprite?.polys ?? []).map((poly): ManifestLayer => {
    // Keep v1 units (1 grid cell = 15 units) so coordinates stay exact; renderers divide.
    const inUnits = poly.space === 'unit';
    const first = poly.points.at(0);
    const randomStar = inUnits && !!first && first[0] >= 999 && first[1] >= 1999;
    const points = randomStar ? poly.points.map(([x, y]) => [x - 1000, y - 2000]) : poly.points;
    return {
      palette: poly.palette,
      ...(randomStar ? { anchor: 'randomStar' as const } : {}),
      ...(inUnits ? { kind: 'pixel' as const, units: 'unit' as const } : {}),
      points: points.map(([x, y]) => [round4(x), round4(y)]),
    };
  });
}

const roundLayer = (layer: RecordedLayer) => ({
  palette: layer.palette,
  ...(layer.alpha !== 1 ? { alpha: round4(layer.alpha) } : {}),
  points: layer.points.map(([x, y]) => [round4(x), round4(y)]),
});

function draftManifest(block: RecordedBlock, runtime: RecordedRuntime) {
  const unitsPerGrid = runtime.gridSize / runtime.unit; // 15
  const id = v2Id(block.category, block.type);
  const notes: string[] = [...block.errors];
  const source = findSource(block.type);
  const exprs = source ? uiValueExprs(source.text) : {};
  const layers = spriteLayers(block);
  if (!layers.length) notes.push('no sprite polygons recorded');
  if (layers.some((layer) => layer.palette !== null && layer.palette < 0))
    notes.push('fill colour not found in App.Palette');
  const defaults = block.defaults as Record<string, unknown> | null | undefined;
  const keys = [...new Set([...Object.keys(defaults ?? {}), ...Object.keys(exprs)])];
  const sliders = slidersOf(block.optionsForm);
  const params = keys.map((key) => {
    const expr = exprs[key] as string | undefined;
    const ui = sliders[key];
    const direct = !expr || expr === `this.Params.${key}`;
    if (!direct)
      notes.push(
        `param '${key}': UI value is \`${expr}\` (non-identity transform; define real units)`,
      );
    return {
      key,
      default: defaults?.[key] ?? null,
      unit: null,
      v1: { ui: ui ?? null, uiValueExpr: expr ?? null },
    };
  });
  notes.push('params: units/ranges in real units not yet defined (draft)');
  const manifest = {
    $schema: '../schema/block.schema.json',
    id,
    draft: true,
    category: block.category,
    kind: kindOf(block.type, block.chain),
    name: block.l10n?.name ?? block.name,
    description: block.l10n?.description ?? '',
    v1: {
      type: block.type,
      class: block.chain,
      l10nKey: block.l10n?.key ?? null,
      source: source?.path ?? null,
      sha: V1_SHA,
    },
    connection: block.catchment !== null ? { catchment: block.catchment } : null,
    geometry: {
      units: 'grid',
      unitsPerGrid,
      layers,
      outline: block.outline,
      menuOffset: block.menuOffset
        ? [
            round4(block.menuOffset.x / runtime.gridSize),
            round4(block.menuOffset.y / runtime.gridSize),
          ]
        : [0, 0],
      ...(block.overlays.length
        ? {
            overlays: block.overlays.map((overlay) => ({
              ...overlay,
              states: Object.fromEntries(
                Object.entries(overlay.states).map(([state, stateLayers]) => [
                  state,
                  stateLayers.map(roundLayer),
                ]),
              ),
            })),
          }
        : {}),
    },
    params,
    review: notes,
  };
  return { id, manifest, notes };
}

export async function extract(args: string[]) {
  const { chromium } = await import('playwright');
  const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'blocks';
  const port = randomPort();
  const server = await serve(port);
  const browser = await chromium.launch();
  let runtime: RecordedRuntime;
  let palettes: RecordedPalette[];
  try {
    const session = await bootV1(browser, port, { width: 1280, height: 800 }, 1);
    runtime = await recordBlocks(session, V1_BLOCKS);
    palettes = await recordPalettes(session);
    if (session.errors.length)
      console.error(
        `page errors during extract: ${session.errors.length} (first: ${session.errors[0]})`,
      );
    await session.close();
  } finally {
    await browser.close();
    server.close();
  }

  const written: string[] = [],
    skipped: string[] = [],
    review: Record<string, string[]> = {};
  for (const block of runtime.blocks) {
    const { id, manifest, notes } = draftManifest(block, runtime);
    const dir = join(outDir, block.category);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${id}.block.json`);
    if (
      existsSync(file) &&
      (JSON.parse(readFileSync(file, 'utf8')) as { draft?: boolean }).draft === false
    ) {
      skipped.push(file);
      continue;
    }
    writeFileSync(file, compactJson(manifest));
    written.push(file);
    review[id] = notes;
  }
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, 'v1-palettes.json'),
    JSON.stringify({ v1Sha: V1_SHA, themes: palettes }, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({
      written: written.length,
      skipped,
      palettes: palettes.length,
      withIssues: Object.entries(review)
        .filter(([, value]) => value.length > 1)
        .map(([id, value]) => `${id}(${value.length - 1})`),
    }),
  );
}
