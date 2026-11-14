// Tiny static server for e2e tests (no dependencies). Serves web/dist on a random port.
import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const MIME: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.map': 'application/json',
  '.wasm': 'application/wasm', '.json': 'application/json', '.png': 'image/png' };

export async function serveDist(dir = 'web/dist'): Promise<{ url: string; server: Server }> {
  if (!existsSync(join(dir, 'library.html'))) throw new Error(`${dir} missing: run \`pnpm bd wasm build && pnpm -C web build\``);
  const server = createServer((req, res) => {
    let p = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    if (p.endsWith('/')) p += 'index.html';
    const f = join(dir, p);
    if (!existsSync(f)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' }).end(readFileSync(f));
  });
  await new Promise<void>(r => server.listen(0, r));
  return { url: `http://localhost:${(server.address() as { port: number }).port}`, server };
}
