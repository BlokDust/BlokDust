// ui-regressions: Share links: the field, its colour, copying and the phone layout.
import { OUT, blk, browser, comp, open, toCss, txt, type RegressionTest, url } from './harness.ts';
import { makeLink, openPatches, patchesAt, patchesClick } from './patchesPanel.ts';
import type { MessagePanelText } from './v1Views.ts';

export const shareTests: Record<string, RegressionTest> = {
  /** The Patches panel's name and link fields use the theme's text colour (v1 ThemeManager set
   * #shareUrl and #shareTitle's). */
  async 'share-text-colour'(errors) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await makeLink(page);
    const colours = await page.evaluate(() =>
      ['patchTitleInput', 'patchUrlText'].map((id) => {
        const field = document.getElementById(id);
        return field ? getComputedStyle(field).color : null;
      }),
    );
    await page.screenshot({ path: `${OUT}/share-text-colour.png` });
    await page.close();
    return [
      colours.every((colour) => colour === txt),
      { want: txt, title: colours[0], url: colours[1] },
    ];
  },
  /** The link field is one line like the title field, scrollbars hidden (the style is checked too:
   * headless Chrome never draws them), and a click selects the whole link. */
  async 'share-url-field'(errors) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await makeLink(page);
    const el = await page.evaluate(() => {
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
    await page.mouse.click(el.rect[0] + el.rect[2] / 2, el.rect[1] + el.rect[3] / 2);
    await page.waitForTimeout(200);
    const sel = await page.evaluate(() => {
      const input = document.getElementById('patchUrlText') as HTMLInputElement;
      return [input.selectionStart, input.selectionEnd, document.activeElement === input];
    });
    await page.screenshot({ path: `${OUT}/share-url-field.png` });
    await page.close();
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
  /** CHG-0013: the plugin's share link opens the site, which makes the link on load and shows it
   * in the address bar; the start screen stands alone, and Patches › SAVE has link and name. */
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
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(
      `${url}/index.html?splash=1&c=${token}&t=${encodeURIComponent('Bass + Bells')}&share=1`,
    );
    await page.waitForFunction(() => window.__bd_probe);
    await page.waitForTimeout(1500);
    const before = await page.evaluate(() => ({
      panel: window.__bd_probe.scene.PatchesPanel.Open,
      link: !!window.__bd_probe.scene.host.links?.current(),
    }));
    await page.screenshot({ path: `${OUT}/share-from-plugin-start.png` });
    await page.mouse.click(640, 400);
    await page
      .waitForFunction(() => !document.getElementById('start'), null, { timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(1000);
    const result = await page.evaluate(() => {
      const pp = window.__bd_probe.scene.PatchesPanel,
        link = window.__bd_probe.scene.host.links?.current();
      return {
        open: pp.Open,
        title: pp.Title,
        blocks: window.__bd_probe.state.blocks.length,
        search: location.search,
        link: link?.url ?? null,
        stale: link?.stale,
        state: pp.shareState(),
      };
    });
    await page.screenshot({ path: `${OUT}/share-from-plugin.png` });
    await page.close();
    const ok =
      !before.panel &&
      !result.open &&
      result.title === 'Bass + Bells' &&
      result.blocks === 2 &&
      !result.search.includes('share=') &&
      result.search.includes('c=p') &&
      !!result.link &&
      result.link.endsWith(result.search) &&
      result.stale === false &&
      result.state.save !== 'make';
    return [ok, { before, ...result, link: result.link?.slice(0, 60) }];
  },
  /** Web SAVE tab: SAVE, with SAVE AS and DOWNLOAD PATCH quiet below. SAVE makes the link (COPY
   * LINK copies it) and is off until a change; a link it can't save over gets a new one. */
  async 'share-link-inline'(errors: string[]) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const seen: string[] = (window.__texts = []);
      const proto = CanvasRenderingContext2D.prototype,
        drawText = Object.getOwnPropertyDescriptor(proto, 'fillText')
          ?.value as typeof proto.fillText;
      proto.fillText = function (text: string, ...rest: [number, number, number?]) {
        seen.push(text);
        drawText.call(this, text, ...rest);
      };
    });
    await page.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForTimeout(2500);
    const link = () => page.evaluate(() => window.__bd_probe.scene.host.links?.current() ?? null);
    const state = () => page.evaluate(() => window.__bd_probe.scene.PatchesPanel.shareState());
    const texts = () =>
      page.evaluate(() => {
        const texts = window.__texts ?? [];
        const unique = [...new Set(texts)];
        texts.length = 0;
        return unique;
      });
    await texts();
    await openPatches(page);
    await page.waitForTimeout(300);
    const before = await texts(),
      at = await page.evaluate(() =>
        ['share', 'saveAs', 'save'].map((name) =>
          window.__bd_probe.scene.PatchesPanel.centreOf(name),
        ),
      ),
      xs = at.map((centre) => centre?.[0] ?? NaN);
    await page.screenshot({ path: `${OUT}/save-tab.png` });
    await patchesClick(page, 'close', 900);
    const first = await makeLink(page);
    const fresh = await link(),
      freshState = await state();
    await texts();
    await page.mouse.move(5, 5);
    await page.mouse.move(8, 8);
    await page.waitForTimeout(300);
    const withLink = await texts();
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await patchesClick(page, 'copyLink', 300); // COPY LINK: the message bar says so
    const copied = {
      line: await page.evaluate(() => {
        const messagePanel = window.__bd_probe.scene.MessagePanel as unknown as MessagePanelText;
        return messagePanel.Open && /link copied/i.test(messagePanel._Value?.string ?? '');
      }),
      clip: await page.evaluate(() => navigator.clipboard.readText()),
    };
    await page.screenshot({ path: `${OUT}/share-link-inline.png` });
    await patchesClick(page, 'close', 900);
    const [x, y] = await toCss(page, 0, 0.2);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 120, y, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await openPatches(page);
    const stale = await link(),
      staleState = await state();
    await page.screenshot({ path: `${OUT}/share-link-stale.png` });
    await patchesClick(page, 'share', 200); // SAVE: can't save over this link → a new one
    await page.waitForFunction(
      (prev) => (document.getElementById('patchUrlText') as HTMLInputElement).value !== prev,
      first,
      { timeout: 20000 },
    );
    const second = await link();
    await context.close();
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
      !!at[0] &&
      !!at[1] &&
      !!at[2] &&
      at[1][1] > at[0][1] + 50 &&
      at[2][1] === at[1][1] &&
      !before.some((text) => /blokdust patch file|shareable link/i.test(text)) &&
      /[?&]c=/.test(first) &&
      fresh?.url === first &&
      !fresh.stale &&
      freshState.save === null &&
      !freshState.saveAs &&
      withLink.includes('Saved. Share your creation with this unique URL:') &&
      withLink.includes('COPY LINK') &&
      !withLink.includes('SAVE') &&
      !withLink.some((text) => gone.includes(text)) &&
      copied.line &&
      copied.clip === first &&
      !!stale?.stale &&
      staleState.save === 'new' &&
      staleState.saveAs &&
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
  // CHG-0035: saving a link copies it at once, no second click: LINK COPIED.
  async 'save-copies-link'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: url });
    const link = await makeLink(page);
    await page
      .waitForFunction(() => !!window.__bd_probe.scene.PatchesPanel.lastSaved, null, {
        timeout: 5000,
      })
      .catch(() => {});
    // The SAVE button goes once saved; the message bar says SAVED · LINK COPIED.
    const result = await page.evaluate(async () => {
      const scene = window.__bd_probe.scene;
      return {
        clip: await navigator.clipboard.readText(),
        saved: scene.PatchesPanel.lastSaved,
        bar: (scene.MessagePanel as unknown as MessagePanelText)._Value?.string ?? '',
      };
    });
    await page.close();
    return [
      result.clip === link && !!result.saved?.copied && /link copied/i.test(result.bar),
      { link, ...result },
    ];
  },
  /** On a phone, COPY LINK and SHARE (the device's share sheet) sit under the link. */
  async 'share-link-phone'(errors: string[]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      navigator.share = (data?: ShareData) => {
        window.__shared = data;
        return Promise.resolve();
      };
    });
    await page.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      window.__bd_probe.scene.PatchesPanel.OpenPanel(0);
    });
    await page.waitForTimeout(1200);
    const [sx, sy] = await patchesAt(page, 'share');
    await page.touchscreen.tap(sx, sy);
    await page
      .waitForFunction(() => !!window.__bd_probe.scene.PatchesPanel.centreOf('shareLink'), null, {
        timeout: 20000,
      })
      .catch(() => {});
    await page.waitForTimeout(400);
    const at = await page.evaluate(() => {
      const pp = window.__bd_probe.scene.PatchesPanel;
      return {
        copy: pp.centreOf('copyLink'),
        share: pp.centreOf('shareLink'),
        url: pp.centreOf('url'),
      };
    });
    if (at.share) {
      await page.touchscreen.tap(at.share[0], at.share[1]);
      await page.waitForTimeout(300);
    }
    const shared = await page.evaluate(() => window.__shared ?? null);
    await page.screenshot({ path: `${OUT}/share-link-phone.png` });
    await context.close();
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
