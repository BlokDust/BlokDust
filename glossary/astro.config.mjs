import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://blokdust.funputs.com',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never' },
  image: { service: { entrypoint: 'astro/assets/services/noop' } },
  devToolbar: { enabled: false },
});
