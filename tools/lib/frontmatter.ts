// Minimal, dependency-free YAML-ish frontmatter parser.
// Supports: `key: value`, `key: [a, b]`, `key:` (empty), quoted strings.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type Meta = Record<string, string | string[]>;
export interface Doc {
  path: string;
  meta: Meta;
  body: string;
}

export function parseFrontmatter(src: string): { meta: Meta; body: string } | null {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(src);
  if (!m) return null;
  const meta: Meta = {};
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '');
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      meta[kv[1]] = v
        .slice(1, -1)
        .split(',')
        .map((s) => unquote(s.trim()))
        .filter(Boolean);
    } else {
      meta[kv[1]] = unquote(v);
    }
  }
  return { meta, body: m[2] };
}

const unquote = (s: string) => s.replace(/^["'](.*)["']$/, '$1');

export function walk(dir: string, filter: (p: string) => boolean): string[] {
  const out: string[] = [];
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries.sort()) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p, filter));
    else if (filter(p)) out.push(p);
  }
  return out;
}

export function loadDocs(
  root: string,
  dir: string,
  skip: (p: string) => boolean,
): { docs: Doc[]; errors: string[] } {
  const docs: Doc[] = [];
  const errors: string[] = [];
  for (const p of walk(join(root, dir), (f) => f.endsWith('.md') && !skip(f))) {
    const parsed = parseFrontmatter(readFileSync(p, 'utf8'));
    const rel = relative(root, p);
    if (!parsed) {
      errors.push(`${rel}: missing frontmatter`);
      continue;
    }
    docs.push({ path: rel, meta: parsed.meta, body: parsed.body });
  }
  return { docs, errors };
}

export const str = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v.join(', ') : (v ?? '');
export const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
