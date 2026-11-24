// Hosting under a base path, on a canonical host, and from the former path (SHARING-0004–0006), run by
// tests/e2e/sharing.ts.
import { startLocal } from '../../../tools/server/lib.ts';
import { type SharingTests, remote, based, base, check } from './harness.ts';

export const hostingTests: SharingTests = {
  /** CHG-0005 task 10: under a base path (`--base`, or a deployed /blokdust): the build's files are there, the bare
   * base redirects to base/, links from before the move (root `/?c=`, `/embed/`) redirect into it, and the API also
   * answers at the root (plugin builds that call it there). */
  async 'base-path'() {
    const url = new URL(base),
      b = url.pathname.replace(/\/+$/, '');
    if (!b) return; // served at the root: nothing to check
    const get = (path: string) => fetch(`${url.origin}${path}`, { redirect: 'manual' });
    const page = await get(`${b}/`),
      html = await page.text();
    check(
      'base/: the app, its links under the base',
      page.status === 200 && html.includes(`content="${base}"`),
      page.status,
    );
    const asset = (/src="\.\/(assets\/[^"]+\.js)"/.exec(html) ?? [])[1];
    check(
      "base/: the build's files under the base",
      !!asset && (await get(`${b}/${asset}`)).status === 200,
      asset,
    );
    const bare = await get(b);
    check(
      'bare base → base/',
      bare.status === 301 && new URL(bare.headers.get('location')!, url).pathname === `${b}/`,
      bare.headers.get('location'),
    );
    const old = await get('/?c=A000000000&t=x');
    check(
      'an old root link → the same link under the base',
      old.status === 301 && (old.headers.get('location') ?? '').endsWith(`${b}/?c=A000000000&t=x`),
      old.headers.get('location'),
    );
    const oldEmbed = await get('/embed/A000000000');
    check(
      'an old embed link → under the base',
      oldEmbed.status === 301 &&
        (oldEmbed.headers.get('location') ?? '').endsWith(`${b}/embed/A000000000`),
      oldEmbed.headers.get('location'),
    );
    check(
      'the API also answers at the root',
      (await get('/api/config')).status === 200 && (await get(`${b}/api/config`)).status === 200,
    );
    check('nothing else outside the base', (await get('/nope.js')).status === 404);
  },

  /** SHARING-0004/0005: a Worker whose public address is on another host, under a base path
   * sends its pages there; the API stays answerable where it is. Local `--base` runs only (a second Worker). */
  async 'canonical-host'() {
    if (remote || !based) return;
    const localServer = await startLocal({
      name: 'canon',
      env: 'based',
      vars: {
        TURNSTILE_SECRET: 'test-secret',
        PUBLIC_BASE_URL: 'https://funputs.example/blokdust',
      },
    });
    try {
      const loc = async (path: string) => {
        const response = await fetch(`${localServer.url}${path}`, { redirect: 'manual' });
        return [response.status, response.headers.get('location')] as const;
      };
      const page = await loc('/blokdust/?c=A000000000&t=x'),
        root = await loc('/?c=A000000000'),
        embed = await loc('/blokdust/embed/A000000000');
      check(
        'pages on another host → the public address',
        page[0] === 301 &&
          page[1] === 'https://funputs.example/blokdust/?c=A000000000&t=x' &&
          root[1] === 'https://funputs.example/blokdust/?c=A000000000' &&
          embed[1] === 'https://funputs.example/blokdust/embed/A000000000',
        { page, root, embed },
      );
      check(
        '… the API stays answerable there',
        (await fetch(`${localServer.url}/blokdust/api/config`)).status === 200 &&
          (await fetch(`${localServer.url}/api/config`)).status === 200,
      );
      check(
        "… and the build's files too",
        (await fetch(`${localServer.url}/blokdust/favicon.ico`)).status === 200,
      );
    } finally {
      await localServer.stop();
    }
  },

  /** SHARING-0006: the public site is at a root (blokdust.funputs.com). The former base path /blokdust, where
   * funputs.com/blokdust lands, sends its pages there with a 302 (a landing page may replace it later) and answers the
   * API in place. Other hosts (production's workers.dev) send their pages to the public site. Local: a second Worker
   * with production's settings; remote (smoke): the legacy path on the deployed host. */
  async 'legacy-path'() {
    if (based) return;
    const loc = async (url: string, method = 'GET') => {
      const response = await fetch(url, { method, redirect: 'manual' });
      return [response.status, response.headers.get('location')] as const;
    };
    if (remote) {
      const url = new URL(base);
      if (url.pathname.replace(/\/+$/, '')) return; // a deployment under a prefix has no legacy path
      const page = await loc(`${url.origin}/blokdust/?c=A000000000&t=x`);
      check(
        '/blokdust/ → 302 to the same page at the root',
        page[0] === 302 && page[1] === `${url.origin}/?c=A000000000&t=x`,
        page,
      );
      check(
        '/blokdust/api answers in place',
        (await fetch(`${url.origin}/blokdust/api/config`)).status === 200,
      );
      return;
    }
    const pub = 'https://blokdust.example';
    const localServer = await startLocal({
      name: 'legacy',
      vars: {
        TURNSTILE_SECRET: 'test-secret',
        PUBLIC_BASE_URL: pub,
        LEGACY_BASE_PATH: '/blokdust',
      },
    });
    try {
      const [page, bare, idx, embed, root, rootEmbed] = await Promise.all(
        [
          '/blokdust/?c=A000000000&t=x',
          '/blokdust',
          '/blokdust/index.html',
          '/blokdust/embed/A000000000',
          '/?c=A000000000',
          '/embed/A000000000',
        ].map((p) => loc(localServer.url + p)),
      );
      check(
        'legacy pages → 302 to the same page on the public site',
        page[0] === 302 &&
          page[1] === `${pub}/?c=A000000000&t=x` &&
          bare[0] === 302 &&
          bare[1] === `${pub}/` &&
          idx[1] === `${pub}/` &&
          embed[0] === 302 &&
          embed[1] === `${pub}/embed/A000000000`,
        { page, bare, idx, embed },
      );
      check(
        '… other files under it too',
        (await loc(`${localServer.url}/blokdust/favicon.ico`))[1] === `${pub}/favicon.ico`,
      );
      check(
        '… the API answers in place',
        (await fetch(`${localServer.url}/blokdust/api/config`)).status === 200,
      );
      check(
        '… other methods there: 404',
        (await loc(`${localServer.url}/blokdust/`, 'POST'))[0] === 404,
      );
      check(
        'pages on another host → the public site (301)',
        root[0] === 301 &&
          root[1] === `${pub}/?c=A000000000` &&
          rootEmbed[0] === 301 &&
          rootEmbed[1] === `${pub}/embed/A000000000`,
        { root, rootEmbed },
      );
      check(
        "… its API and the build's files answer there",
        (await fetch(`${localServer.url}/api/config`)).status === 200 &&
          (await fetch(`${localServer.url}/favicon.ico`)).status === 200,
      );
    } finally {
      await localServer.stop();
    }
  },
};
