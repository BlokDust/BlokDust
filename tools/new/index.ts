// bd new — scaffold ADRs, domain specs and change proposals from docs/specs/templates with the next free ID.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { walk } from '../lib/frontmatter.ts';

const [kind, ...rest] = process.argv.slice(2);
const today = new Date().toISOString().slice(0, 10);
const slug = (s: string) => {
  const t = s.toLowerCase().replace(/\+\+/g, 'pp').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return t.length <= 50 ? t : t.slice(0, 50).replace(/-[^-]*$/, '');
};
const tpl = (f: string, vars: Record<string, string>) =>
  readFileSync(join('docs/specs/templates', f), 'utf8').replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
const nextNum = (files: string[], re: RegExp) =>
  String(Math.max(0, ...files.map(f => Number(re.exec(f)?.[1] ?? 0))) + 1).padStart(4, '0');
const usage = () => { console.error('usage: bd new adr <domain> "Title" | bd new spec <domain> "Title" | bd new change "Title"'); process.exit(2); };

let created: string[] = [];
if (kind === 'adr') {
  const [domain, title] = rest; if (!domain || !title) usage();
  if (!/^[a-z][a-z0-9-]*$/.test(domain)) { console.error('domain must be lowercase kebab-case'); process.exit(2); }
  const dir = join('docs/decisions', domain); mkdirSync(dir, { recursive: true });
  const P = domain.toUpperCase();
  const id = `${P}-${nextNum(walk('docs/decisions', f => f.endsWith('.md')), new RegExp(`${P}-(\\d{4})-`))}`;
  const file = join(dir, `${id}-${slug(title)}.md`);
  writeFileSync(file, tpl('adr.md', { id, title, domain, date: today })); created.push(file);
} else if (kind === 'spec') {
  const [domain, title] = rest; if (!domain || !title) usage();
  const dir = join('docs/specs/domains', domain); mkdirSync(dir, { recursive: true });
  const id = `SPEC-${domain.toUpperCase()}-${slug(title).toUpperCase()}`;
  const file = join(dir, `${slug(title)}.md`);
  if (existsSync(file)) { console.error(`exists: ${file}`); process.exit(1); }
  writeFileSync(file, tpl('spec.md', { id, title, domain, date: today })); created.push(file);
} else if (kind === 'change') {
  const [title] = rest; if (!title) usage();
  const n = nextNum(readdirSync('docs/specs/changes'), /^(\d{4})-/);
  const dir = join('docs/specs/changes', `${n}-${slug(title)}`); mkdirSync(dir, { recursive: true });
  const vars = { id: `CHG-${n}`, title, date: today };
  writeFileSync(join(dir, 'proposal.md'), tpl('change-proposal.md', vars));
  writeFileSync(join(dir, 'tasks.md'), tpl('change-tasks.md', vars));
  created.push(join(dir, 'proposal.md'), join(dir, 'tasks.md'));
} else usage();
console.log(JSON.stringify({ created }));
console.error('Next: fill in the file(s), then run `pnpm bd index`.');
