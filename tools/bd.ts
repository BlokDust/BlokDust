// bd: single entry point for repo tools. `pnpm bd <tool> [...args]`, `pnpm bd list`.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDir = dirname(fileURLToPath(import.meta.url));
process.chdir(join(toolsDir, '..'));
const [name, ...args] = process.argv.slice(2);

if (!name || name === 'list' || name === 'help') {
  for (const d of readdirSync(toolsDir).sort()) {
    const m = join(toolsDir, d, 'tool.json');
    if (existsSync(m)) {
      const t = JSON.parse(readFileSync(m, 'utf8'));
      console.log(`${t.name.padEnd(10)} ${t.summary}`);
    }
  }
  process.exit(0);
}
const entry = join(toolsDir, name, 'index.ts');
if (!existsSync(entry)) {
  console.error(`unknown tool '${name}'. Run: pnpm bd list`);
  process.exit(2);
}
const result = spawnSync(process.execPath, [entry, ...args], { stdio: 'inherit' });
process.exit(result.status ?? 1);
