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
const designed = proposed.designed.map((p: any) => ({
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
