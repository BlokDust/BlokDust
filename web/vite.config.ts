import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { setting } from '../tools/lib/local-config.ts';
import { resolve } from 'node:path';

const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf8'));
const sha = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { cwd: import.meta.dirname, encoding: 'utf8' }).trim();
const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: import.meta.dirname, encoding: 'utf8' }).trim();
const supportBase = setting('BLOKDUST_SUPPORT_PUBLIC_URL', setting('BLOKDUST_PRODUCTION_PUBLIC_URL'));
const supportUrl = supportBase ? new URL('api/support', supportBase.replace(/\/?$/, '/')).href : '';
if (supportUrl && (new URL(supportUrl).username || new URL(supportUrl).password)) throw new Error('Support URL must not contain credentials');
if (supportUrl && new URL(supportUrl).protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(new URL(supportUrl).hostname)) throw new Error('Support URL must use HTTPS');

// Relative base so the build works under any path (e.g. a placeholder workers.dev URL or /blokdust, SHARING-0004).
export default defineConfig({
  base: './',
  // Every build carries the licences (CHG-0005 task 11): v1's MIT notice and the others (NOTICE.md), and the AGPL.
  plugins: [{
    name: 'blokdust-notices',
    generateBundle() {
      const root = resolve(import.meta.dirname, '..');
      this.emitFile({ type: 'asset', fileName: 'NOTICE.txt', source: readFileSync(resolve(root, 'NOTICE.md'), 'utf8') });
      this.emitFile({ type: 'asset', fileName: 'LICENSE.txt', source: readFileSync(resolve(root, 'LICENSE'), 'utf8') });
    },
  }],
  define: { __BD_VERSION__: JSON.stringify(pkg.version), __BD_BUILD__: JSON.stringify(sha + (dirty ? '-dirty' : '')), __BD_SUPPORT_URL__: JSON.stringify(supportUrl) },
  // Review over Tailscale Serve (`tailscale serve --https=<port> http://127.0.0.1:<port>`): allow tailnet hostnames.
  server: { allowedHosts: ['.ts.net'] },
  preview: { allowedHosts: ['.ts.net'] },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        library: resolve(import.meta.dirname, 'library.html'),
        golden: resolve(import.meta.dirname, 'golden.html'),
        visual: resolve(import.meta.dirname, 'visual.html'),
      },
    },
  },
});
