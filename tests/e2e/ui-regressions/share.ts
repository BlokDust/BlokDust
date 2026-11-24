// ui-regressions: Share links: the field, its colour, copying and the phone layout.
import { OUT, blk, browser, comp, open, toCss, txt, type RegressionTest, url } from './harness.ts';
import { makeLink, openPatches, patchesClick } from './patchesPanel.ts';

export const shareTests: Record<string, RegressionTest> = {
  /** Share text fields use the theme's text colour (v1 ThemeManager sets #shareUrl/#shareTitle colour); now the Patches
   * panel's name and link fields. */
  async 'share-text-colour'(errors) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await makeLink(p);
    const colours = await p.evaluate(() =>
      ['patchTitleInput', 'patchUrlText'].map(
        (id) => getComputedStyle(document.getElementById(id)!).color,
      ),
    );
    await p.screenshot({ path: `${OUT}/share-text-colour.png` });
    await p.close();
    return [
      colours.every((colour) => colour === txt),
      { want: txt, title: colours[0], url: colours[1] },
    ];
  },
  /** The share link field: one line like the title field, scrollbars hidden (headless Chrome never draws them, so
   * the style is checked too), and a click selects the whole link. */
  async 'share-url-field'(errors) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await makeLink(p);
    const el = await p.evaluate(() => {
      const input = document.getElementById('patchUrlText') as HTMLInputElement,
        boundingClientRect = input.getBoundingClientRect();
      const cs = getComputedStyle(input);
      return {
        tag: input.tagName,
        len: input.value.length,
        rect: [
          boundingClientRect.x,
          boundingClientRect.y,
          boundingClientRect.width,
          boundingClientRect.height,
        ],
        scrollbarX: input.offsetHeight - input.clientHeight,
        scrollbarY: input.offsetWidth - input.clientWidth,
        overflow: cs.overflow,
        scrollbarWidth: cs.scrollbarWidth,
      };
    });
    await p.mouse.click(el.rect[0] + el.rect[2] / 2, el.rect[1] + el.rect[3] / 2);
    await p.waitForTimeout(200);
    const sel = await p.evaluate(() => {
      const input = document.getElementById('patchUrlText') as HTMLInputElement;
      return [input.selectionStart, input.selectionEnd, document.activeElement === input];
    });
    await p.screenshot({ path: `${OUT}/share-url-field.png` });
    await p.close();
    const pass =
      el.len > 20 &&
      el.scrollbarX === 0 &&
      el.scrollbarY === 0 &&
      el.scrollbarWidth === 'none' &&
      el.tag === 'INPUT' &&
      sel[0] === 0 &&
      sel[1] === el.len &&
      sel[2] === true;
    return [pass, { ...el, selection: sel }];
  },
  /** The plugin's CREATE SHARE LINK opens the patch on the site (`?c=p…&t=…&share=1`). Owner (2026-11-13, CHG-0013):
   * it opened the Patches panel at once, whose title showed over the start screen, and after START the panel was
   * still in the way, one more click from the link. Now the site makes the link as it loads (the user asked for it in
   * the app) and the address bar shows it (here, with no backend, the self-contained link); the start screen is the
   * start screen alone, START shows the scene, and Patches › SAVE has the link and the name. */
  async 'share-from-plugin'(errors: string[]) {
    const { deflateRawSync } = await import('node:zlib');
    const patch = {
      format: 'blokdust.patch',
      version: 2,
      blocks: [
        { id: 'a', type: 'source.tone', x: 0, y: 0, params: {} },
        { id: 'b', type: 'power.emitter', x: -60, y: 0, params: {} },
      ],
    };
    const token = 'p' + deflateRawSync(Buffer.from(JSON.stringify(patch))).toString('base64url');
    const p = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(
      `${url}/index.html?splash=1&c=${token}&t=${encodeURIComponent('Bass + Bells')}&share=1`,
    );
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.waitForTimeout(1500);
    const before = await p.evaluate(() => ({
      panel: (window as any).__bd_probe.scene.PatchesPanel.Open,
      link: !!(window as any).__bd_probe.scene.host.links.current(),
    }));
    await p.screenshot({ path: `${OUT}/share-from-plugin-start.png` });
    await p.mouse.click(640, 400);
    await p
      .waitForFunction(() => !document.getElementById('start'), null, { timeout: 10000 })
      .catch(() => {});
    await p.waitForTimeout(1000);
    const r = await p.evaluate(() => {
      const pp = (window as any).__bd_probe.scene.PatchesPanel,
        link = (window as any).__bd_probe.scene.host.links.current();
      return {
        open: pp.Open,
        title: pp.Title,
        blocks: (window as any).__bd_probe.state.blocks.length,
        search: location.search,
        link: link?.url ?? null,
        stale: link?.stale,
        state: pp.shareState(),
      };
    });
    await p.screenshot({ path: `${OUT}/share-from-plugin.png` });
    await p.close();
    const ok =
      !before.panel &&
      !r.open &&
      r.title === 'Bass + Bells' &&
      r.blocks === 2 &&
      !r.search.includes('share=') &&
      r.search.includes('c=p') &&
      !!r.link &&
      r.link.endsWith(r.search) &&
      r.stale === false &&
      r.state.save !== 'make';
    return [ok, { before, ...r, link: r.link?.slice(0, 60) }];
  },
  /** Owner (2026-11-11): the web SAVE tab has SAVE · SAVE AS · DOWNLOAD PATCH, with no help lines (owner review 2,
   * option A: SAVE the main button, SAVE AS and DOWNLOAD PATCH quiet below it, left and right); the
   * link shows with "Share your creation with this unique URL:" and a click on it copies it. SAVE makes the link, then
   * is off until the patch changes; a link this browser can't save over (here: no backend, a self-contained link)
   * gets a new one. SAVE / SAVE AS on a stored link are checked by test:sharing. */
  async 'share-link-inline'(errors: string[]) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.addInitScript(() => {
      const seen: string[] = ((window as any).__texts = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) {
        seen.push(t);
        return (f as any).call(this, t, ...a);
      };
    });
    await p.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForTimeout(2500);
    const link = () => p.evaluate(() => (window as any).__bd_probe.scene.host.links.current());
    const state = () =>
      p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.shareState());
    const texts = () =>
      p.evaluate(() => {
        const t = (window as any).__texts as string[];
        const r = [...new Set(t)];
        t.length = 0;
        return r;
      });
    await texts();
    await openPatches(p);
    await p.waitForTimeout(300);
    const before = await texts(),
      at = await p.evaluate(() =>
        ['share', 'saveAs', 'save'].map((n) =>
          (window as any).__bd_probe.scene.PatchesPanel.centreOf(n),
        ),
      ),
      xs = at.map((c) => c[0]);
    await p.screenshot({ path: `${OUT}/save-tab.png` });
    await patchesClick(p, 'close', 900);
    const first = await makeLink(p);
    const fresh = await link(),
      freshState = await state();
    await texts();
    await p.mouse.move(5, 5);
    await p.mouse.move(8, 8);
    await p.waitForTimeout(300);
    const withLink = await texts();
    await p.evaluate(() => navigator.clipboard.writeText(''));
    await patchesClick(p, 'copyLink', 300); // COPY LINK (owner, 2026-11-18): the message bar says so
    const copied = {
      line: await p.evaluate(() => {
        const messagePanel = (window as any).__bd_probe.scene.MessagePanel;
        return messagePanel.Open && /link copied/i.test(messagePanel._Value?.string ?? '');
      }),
      clip: await p.evaluate(() => navigator.clipboard.readText()),
    };
    await p.screenshot({ path: `${OUT}/share-link-inline.png` });
    await patchesClick(p, 'close', 900);
    const [x, y] = await toCss(p, 0, 0.2);
    await p.mouse.move(x, y);
    await p.mouse.down();
    await p.mouse.move(x + 120, y, { steps: 6 });
    await p.mouse.up();
    await p.waitForTimeout(300);
    await openPatches(p);
    const stale = await link(),
      staleState = await state();
    await p.screenshot({ path: `${OUT}/share-link-stale.png` });
    await patchesClick(p, 'share', 200); // SAVE: can't save over this link → a new one
    await p.waitForFunction(
      (prev) => (document.getElementById('patchUrlText') as HTMLInputElement).value !== prev,
      first,
      { timeout: 20000 },
    );
    const second = await link();
    await ctx.close();
    const gone = [
      'Save your changes to your link.',
      "Your latest changes aren't in this link yet:",
      'Your link is ready to share.',
      'Save as a new link, and keep this one as it is.',
    ];
    const labels = ['SAVE', 'SAVE AS', 'DOWNLOAD PATCH'];
    const ok =
      labels.every((label) => before.includes(label)) &&
      xs[1] < xs[0] &&
      xs[0] < xs[2] &&
      at[1][1] > at[0][1] + 50 &&
      at[2][1] === at[1][1] &&
      !before.some((t) => /blokdust patch file|shareable link/i.test(t)) &&
      /[?&]c=/.test(first) &&
      fresh?.url === first &&
      !fresh.stale &&
      freshState.save === null &&
      freshState.saveAs === false &&
      withLink.includes('Saved. Share your creation with this unique URL:') &&
      withLink.includes('COPY LINK') &&
      !withLink.includes('SAVE') &&
      !withLink.some((t) => gone.includes(t)) &&
      copied.line &&
      copied.clip === first &&
      stale?.stale === true &&
      staleState.save === 'new' &&
      staleState.saveAs === true &&
      second?.url !== first &&
      !second?.stale;
    return [
      ok,
      {
        before,
        xs,
        first: first.slice(0, 60),
        fresh,
        freshState,
        withLink,
        copied,
        stale,
        staleState,
        second,
      },
    ];
  },
  // Owner (2026-11-17, CHG-0035): saving a link copies it at once (no second click on the link): LINK COPIED.
  async 'save-copies-link'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await p.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: url });
    const link = await makeLink(p);
    await p
      .waitForFunction(() => !!(window as any).__bd_probe.scene.PatchesPanel.lastSaved, null, {
        timeout: 5000,
      })
      .catch(() => {});
    // The SAVE button goes once saved (owner, 2026-11-18): the message bar says SAVED · LINK COPIED.
    const r = await p.evaluate(async () => {
      const s = (window as any).__bd_probe.scene;
      return {
        clip: await navigator.clipboard.readText(),
        saved: s.PatchesPanel.lastSaved,
        bar: String(s.MessagePanel._Value?.string ?? ''),
      };
    });
    await p.close();
    return [r.clip === link && !!r.saved?.copied && /link copied/i.test(r.bar), { link, ...r }];
  },
  /** Owner (2026-11-18, option 3c): on a phone, COPY LINK and SHARE (the device's share sheet) under the link. */
  async 'share-link-phone'(errors: string[]) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.addInitScript(() => {
      (navigator as any).share = async (d: unknown) => {
        (window as any).__shared = d;
      };
    });
    await p.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForTimeout(1500);
    await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.OpenPanel(0));
    await p.waitForTimeout(1200);
    const [sx, sy] = await p.evaluate(() =>
      (window as any).__bd_probe.scene.PatchesPanel.centreOf('share'),
    );
    await p.touchscreen.tap(sx, sy);
    await p
      .waitForFunction(
        () => !!(window as any).__bd_probe.scene.PatchesPanel.centreOf('shareLink'),
        null,
        { timeout: 20000 },
      )
      .catch(() => {});
    await p.waitForTimeout(400);
    const at = await p.evaluate(() => {
      const pp = (window as any).__bd_probe.scene.PatchesPanel;
      return {
        copy: pp.centreOf('copyLink'),
        share: pp.centreOf('shareLink'),
        url: pp.centreOf('url'),
      };
    });
    if (at.share) {
      await p.touchscreen.tap(at.share[0], at.share[1]);
      await p.waitForTimeout(300);
    }
    const shared = await p.evaluate(() => (window as any).__shared ?? null);
    await p.screenshot({ path: `${OUT}/share-link-phone.png` });
    await ctx.close();
    const ok =
      !!at.copy &&
      !!at.share &&
      !!at.url &&
      at.copy[1] > at.url[1] &&
      Math.abs(at.share[1] - at.copy[1]) < 2 &&
      at.share[0] > at.copy[0] &&
      /[?&]c=/.test(shared?.url ?? '');
    return [ok, { at, shared }];
  },
};
