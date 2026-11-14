import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
