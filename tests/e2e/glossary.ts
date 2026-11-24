// SPEC-SHARING-BLOKDUST-GLOSSARY R1–R4: the combined static output works without JavaScript.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serveDist } from './serve.ts';

const origin = 'https://blokdust.funputs.com';
const { url, server } = await serveDist();
try {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 320, height: 760 },
    });
    const page = await context.newPage();
    const sitemap = await context.request.get(url + '/sitemap.xml');
    assert.equal(sitemap.status(), 200);
    const paths = new Set(
      Array.from((await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g), ([, href]) => {
        const loc = new URL(href);
        assert.equal(loc.origin, origin);
        return loc.pathname;
      }),
    );
    for (const path of ['/about/', '/blocks/', '/guide/', '/guide/faq/', '/guide/get-started/'])
      assert(paths.has(path), path);
    const links = new Set<string>();
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    const fragments = new Map<string, string[]>();
    const images = new Set<string>();

    for (const path of paths) {
      const response = await page.goto(url + path);
      assert.equal(response?.status(), 200, path);
      const info = await page.evaluate(() => ({
        title: document.title,
        headings: document.querySelectorAll('main article h1').length,
        hasArtwork: !!document.querySelector('main :is(.banner-art, .guide-grid) img'),
        related: Array.from(document.querySelectorAll('.related a'), (link) =>
          link.getAttribute('href'),
        ),
        styleAttributes: document.querySelectorAll('[style]').length,
        fits: document.documentElement.scrollWidth <= window.innerWidth,
        ids: Array.from(document.querySelectorAll('[id]'), (node) => node.id),
        anchors: Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'), (node) =>
          node.getAttribute('href')!,
        ),
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
        description: document
          .querySelector('meta[name="description"]')
          ?.getAttribute('content')
          ?.trim(),
        og: Object.fromEntries(
          Array.from(document.querySelectorAll('meta[property^="og:"]'), (node) => [
            node.getAttribute('property'),
            node.getAttribute('content'),
          ]),
        ),
        pictures: Array.from(document.images, (img) => ({
          src: img.getAttribute('src')!,
          alt: img.getAttribute('alt'),
          loaded: img.naturalWidth > 0,
        })),
      }));
      assert(info.title && !titles.has(info.title), path);
      titles.add(info.title);
      assert.equal(info.headings, 1, path);
      assert(info.hasArtwork, `Missing banner or cover art on ${path}`);
      assert(info.related.length > 0, `Missing related links on ${path}`);
      assert(!info.related.includes(path), `Related links include the current page on ${path}`);
      assert.equal(info.styleAttributes, 0, path);
      assert(info.fits, `Horizontal overflow on ${path}`);
      assert.equal(info.canonical, origin + path);
      assert.equal(info.og['og:url'], info.canonical);
      assert.equal(info.og['og:title'], info.title);
      assert(info.description && !descriptions.has(info.description), path);
      descriptions.add(info.description);
      assert.equal(info.og['og:description'], info.description, path);
      assert(info.og['og:image'] && info.og['og:image:alt'], path);
      const og = new URL(info.og['og:image']);
      assert.equal(og.origin, origin);
      images.add(og.pathname);
      for (const picture of info.pictures)
        assert(picture.loaded && picture.alt !== null, `${path} ${picture.src}`);
      assert(info.anchors.includes('https://www.instagram.com/blokdust/'), path);
      assert(info.anchors.includes('https://www.tiktok.com/@blokdust'), path);
      fragments.set(path, info.ids);
      if (path === '/blocks/') {
        for (const block of [...paths].filter((route) => /^\/blocks\/[^/]+\/$/.test(route))) {
          assert(
            info.related.includes(block),
            `Block missing from the index’s Related section: ${block}`,
          );
        }
      }
      for (const href of info.anchors) {
        const link = new URL(href, origin + path);
        if (link.origin === origin) links.add(link.pathname + link.hash);
      }
    }

    for (const link of links) {
      const [path, fragment] = link.split('#');
      if (path === '/') {
        assert.equal((await context.request.get(url + path)).status(), 200);
        continue;
      }
      assert(paths.has(path), `Missing page: ${link}`);
      if (fragment) assert(fragments.get(path)?.includes(fragment), `Missing target: ${link}`);
    }
    for (const image of images)
      assert.equal((await context.request.get(url + image)).status(), 200, image);

    await page.setViewportSize({ width: 1440, height: 900 });
    for (const path of ['/about/', '/blocks/', '/blocks/prism/', '/guide/get-started/']) {
      await page.goto(url + path);
      assert(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        path,
      );
    }
    await page.goto(url + '/guide/');
    assert.equal(await page.locator('.guide-tile').count(), 8);
    assert.equal(
      await page
        .locator('.guide-grid')
        .evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length),
      4,
    );
    await page.locator('.menu-toggle').click();
    assert(await page.getByRole('navigation', { name: 'Main navigation' }).isVisible());
    await page.locator('.menu-toggle').click();
    assert(!(await page.getByRole('navigation', { name: 'Main navigation' }).isVisible()));
    await page.goto(url + '/guide/synths/');
    assert.match(
      (await page.locator('.banner-art img').getAttribute('src')) ?? '',
      /synths-1200x400\.jpg$/,
    );
    await page.setViewportSize({ width: 320, height: 760 });
    await page.goto(url + '/guide/');
    assert.equal(
      await page
        .locator('.guide-grid')
        .evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length),
      2,
    );
    await page.goto(url + '/blocks/granular/');
    const references = page.locator('#further-reading');
    assert.equal(
      await references.evaluate((heading) => getComputedStyle(heading).borderTopWidth),
      '2px',
    );
    assert.equal(
      await page
        .locator('#further-reading + ul')
        .evaluate((list) => getComputedStyle(list).listStyleType),
      'none',
    );
    assert.equal(
      await page.locator('.prose').evaluate((prose) => getComputedStyle(prose).borderBottomWidth),
      '0px',
    );

    const instagram = page.getByRole('link', { name: 'Instagram' });
    await instagram.scrollIntoViewIfNeeded();
    assert.equal(
      await instagram.evaluate((link) => getComputedStyle(link).textDecorationLine),
      'none',
    );
    await instagram.hover();
    assert.equal(
      await instagram.evaluate((link) => getComputedStyle(link).textDecorationLine),
      'underline',
    );
    assert.equal(
      await page
        .locator('.site-links li:nth-child(2)')
        .evaluate((item) => getComputedStyle(item).borderInlineStartWidth),
      '2px',
    );
    assert.equal(await page.locator('.site-footer a').count(), 3);

    await page.goto(url + '/about/');
    assert.equal(await page.locator('.prose ul, .prose ol').count(), 0);
    await page.goto(url + '/guide/features/');
    assert.doesNotMatch(await page.locator('main').innerText(), /export a video/i);
    const feature = page.locator('.prose li').first();
    assert.equal(await feature.evaluate((item) => getComputedStyle(item).borderBottomWidth), '0px');
    await page.goto(url + '/guide/get-started/');
    assert.equal(await page.locator('.prose ul, .prose ol').count(), 0);
    assert.equal(await page.locator('.prose img').count(), 12);
    await page.goto(url + '/guide/');
    assert.equal(
      await page.locator('.guide-tile').first().getAttribute('href'),
      '/guide/whats-new/',
    );
    await page.goto(url + '/guide/whats-new/');
    assert.equal(await page.locator('h1').textContent(), 'What’s New in BlokDust 2');
    assert(!paths.has('/guide/original-launch/'));

    await page.goto(url + '/blocks/categories/interaction/');
    const interactionLinks = page.getByRole('region', { name: 'Related' }).getByRole('link');
    for (const name of ['Computer Keyboard', 'MIDI Controller', 'Stage In', 'Touchpad', 'Stage']) {
      assert.equal(await interactionLinks.filter({ hasText: new RegExp(`^${name}$`) }).count(), 1);
    }
    assert.equal(await page.locator('article .block-list').count(), 0);

    await page.goto(url + '/guide/keyboard-shortcuts/');
    assert.equal(await page.locator('h1').textContent(), 'Keyboard Shortcuts');
    assert.match(await page.locator('main').innerText(), /press and hold on empty space/i);
    const selectAll = page
      .locator('.shortcut-row')
      .filter({ has: page.getByRole('heading', { name: 'Select all', exact: true }) });
    assert.deepEqual(await selectAll.locator('kbd').allTextContents(), ['Cmd/Ctrl', 'A']);
    assert.match((await selectAll.locator('p').textContent()) ?? '', /current stage/);
    assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'), '/guide-favicon.ico');
    assert.equal((await context.request.get(url + '/guide-favicon.ico')).status(), 200);
    assert.equal(
      await page.locator('.footer-links').evaluate((nav) => getComputedStyle(nav).borderTopWidth),
      '0px',
    );
    assert.equal(
      await page.locator('.intro').evaluate((p) => getComputedStyle(p).marginBlockEnd),
      '30px',
    );
    const relatedChip = page.getByRole('region', { name: 'Related' }).getByRole('link').first();
    assert.equal(
      await relatedChip.evaluate((link) => getComputedStyle(link).backgroundColor),
      'rgb(255, 89, 0)',
    );
    await page.goto(url + '/blocks/lfo/');
    assert.equal(await page.locator('figcaption, .image-caption').count(), 0);

    await page.goto(url + '/downloads/');
    assert.equal(await page.getByRole('heading', { name: 'iPad', exact: true }).count(), 1);
    assert.equal(
      await page.getByRole('link', { name: 'Browse the App Store for iPad' }).getAttribute('href'),
      'https://apps.apple.com/us/ipad/apps',
    );
    assert.equal(
      await page.locator('a[href^="https://downloads.funputs.com/releases/blokdust/"]').count(),
      2,
    );

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url + '/guide/keyboard-shortcuts/');
    assert.equal(
      await page
        .locator('.shortcut-rows')
        .first()
        .evaluate((row) => row.getBoundingClientRect().width),
      600,
    );
    const piano = page.locator('.shortcut-piano');
    assert.deepEqual(await piano.first().locator('.piano-black').allTextContents(), [
      'S',
      'D',
      'G',
      'H',
      'J',
      'L',
      ';',
    ]);
    assert.deepEqual(await piano.nth(1).locator('.piano-black').allTextContents(), [
      '2',
      '3',
      '5',
      '6',
      '7',
      '9',
      '0',
      '=',
    ]);
    await page.goto(url + '/blocks/lfo/');
    assert.equal(
      await page
        .locator('.screenshot-banner')
        .evaluate((banner) => getComputedStyle(banner).backgroundColor),
      'rgb(238, 221, 195)',
    );
    const openApp = page.locator('.play-link');
    assert.equal(await openApp.evaluate((link) => getComputedStyle(link).borderBottomWidth), '0px');
    await openApp.hover();
    assert.equal(
      await openApp.evaluate((link) => getComputedStyle(link).textDecorationLine),
      'underline',
    );

    const toggle = page.locator('.menu-toggle');
    await toggle.click();
    for (const category of [
      'Source blocks',
      'Effect blocks',
      'Power blocks',
      'Interaction blocks',
    ]) {
      assert.equal(
        await page
          .getByRole('navigation', { name: 'Main navigation' })
          .getByRole('link', { name: category, exact: true })
          .count(),
        1,
      );
    }
    assert.equal(
      await toggle.evaluate((button) => (button as HTMLElement).offsetParent?.className),
      'guide-menu',
    );
    assert.equal(
      await page
        .locator('.menu-panel')
        .evaluate((panel) => (panel as HTMLElement).offsetParent?.className),
      'guide-menu',
    );
    console.log(
      JSON.stringify({ pages: paths.size, internalLinks: links.size, socialImages: images.size }),
    );
  } finally {
    await browser.close();
  }
} finally {
  server.close();
}
