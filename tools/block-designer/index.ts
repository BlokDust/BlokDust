// bd block-designer: an internal design page for new block shapes (not part of the app).
// Fills tools/block-designer/page.html with the v1 palettes, every block manifest and the proposed designs in
// tools/block-designer/proposed.json, and writes .cache/block-designer/index.html. `--open` opens it in the browser.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf8'));

const palettes = readJson(join(root, 'blocks', 'v1-palettes.json'));
const themes = palettes.themes.map((t: any) => ({ name: t.name, colors: t.colors, txt: t.roles.txt }));

const blocks: any[] = [];
for (const dir of ['source', 'effect', 'power', 'interaction']) {
  const d = join(root, 'blocks', dir);
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d).filter(f => f.endsWith('.block.json')).sort()) {
    const m = readJson(join(d, f));
    blocks.push({ id: m.id, name: m.name, category: m.category, outline: m.geometry.outline, layers: m.geometry.layers });
  }
}

const proposed = readJson(join(here, 'proposed.json'));

// `scaffold "<Name>" --id fx.x --kind post-effect [--catchment 6]`: write the block's manifest from its proposed design
// (geometry only; add params by hand, then `pnpm bd codegen`). Refuses to overwrite.
if (process.argv[2] === 'scaffold') {
  const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
  const name = process.argv[3], id = arg('id'), kind = arg('kind');
  const design = proposed.designed.find((d: any) => d.name === name);
  if (!design || !id || !kind) { console.error('usage: bd block-designer scaffold "<Name>" --id <id> --kind <kind> [--catchment n]'); process.exit(2); }
  const out = join(root, 'blocks', design.category, `${id}.block.json`);
  if (existsSync(out)) { console.error(`exists: ${out}`); process.exit(1); }
  const pts = design.geometry.layers.flatMap((l: any) => l.points);
  const mid = (i: number) => { const v = pts.map((p: number[]) => p[i]); return (Math.min(...v) + Math.max(...v)) / 2; };
  const half = (v: number) => Math.round(v * 2) / 2 || 0;
  const catchment = arg('catchment');
  const manifest = {
    $schema: '../schema/block.schema.json', id, draft: false, category: design.category, kind, name,
    description: (proposed.todo.find((t: string[]) => t[0] === name) ?? [])[2] ?? '',
    v1: { type: null },
    connection: catchment ? { catchment: Number(catchment) } : null,
    geometry: { units: 'grid', unitsPerGrid: 14.999999999999998, layers: design.geometry.layers, outline: design.geometry.outline,
      menuOffset: [half(-mid(0)), half(-mid(1))] },
    params: [],
  };
  writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ wrote: `blocks/${design.category}/${id}.block.json` }));
  process.exit(0);
}
// A design whose block has been built is listed once, as the block.
const designed = proposed.designed.filter((p: any) => !blocks.some(b => b.name === p.name)).map((p: any) => ({
  id: 'new.' + p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name: p.name, category: p.category, outline: p.geometry.outline, layers: p.geometry.layers,
}));

const data = JSON.stringify({ themes, blocks, designed, todo: proposed.todo });
const page = readFileSync(join(here, 'page.html'), 'utf8').replace('__DATA__', () => data);
const html = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
  + '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  + '<style>html,body{margin:0}body{font-size:14px}img{max-width:100%}[hidden]{display:none!important}</style>\n'
  + '</head>\n<body>\n' + page + '\n</body>\n</html>\n';

const outDir = join(root, '.cache', 'block-designer');
mkdirSync(outDir, { recursive: true });
const out = join(outDir, 'index.html');
writeFileSync(out, html);

if (process.argv.includes('--open')) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
  spawnSync(cmd, [out], { stdio: 'ignore' });
}
console.log(JSON.stringify({ path: '.cache/block-designer/index.html', blocks: blocks.length, designed: designed.length, themes: themes.length }));
