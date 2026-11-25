// Share links made in the app or the plugin, opened elsewhere, run by tests/e2e/sharing.ts.
import { inflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { sineWav } from '../mock-services.ts';
import {
  type SharingTests,
  remote,
  created,
  base,
  check,
  probe,
  renderHash,
  VIEW,
  OUT,
  api,
  PATCH,
  open,
  press,
  shareVia,
  idOf,
  local,
  closeShare,
  handoff,
  editTokenOf,
  transposeTone,
  hasTranspose,
} from './harness.ts';
import type { PatchesPanelState } from '../pageGlobals.ts';

export const shareLinkTests: SharingTests = {
  /** CHG-0013: the plugin's CREATE SHARE LINK opens `?c=p…&t=…&share=1` here; the page makes the
   * link at once and the address bar shows the short server link, which opens the same patch. */
  async 'share-from-app'(browser) {
    const { deflateRawSync } = await import('node:zlib');
    const token = 'p' + deflateRawSync(Buffer.from(JSON.stringify(PATCH))).toString('base64url');
    const a = await open(
      browser,
      `${base}/?c=${token}&t=${encodeURIComponent('From the app')}&share=1`,
    );
    await a
      .waitForFunction(() => /[?&]c=(?!p)[0-9A-Za-z]{10}(&|$)/.test(location.search), null, {
        timeout: 30000,
      })
      .catch(() => {});
    const url = a.url(),
      id = idOf(url);
    check(
      'share=1 → the address bar shows a server link',
      /^[0-9A-Za-oq-z][0-9A-Za-z]{9}$/.test(id) &&
        !url.includes('share=') &&
        url.includes('t=From'),
      url,
    );
    check(
      '… with the Patches panel closed',
      !(await a.evaluate(() => window.__bd_probe.scene.PatchesPanel.Open)),
    );
    const edit = await editTokenOf(a, id);
    if (id && edit) created.push({ id, token: edit });
    const got = await api('GET', `patches/${id}`);
    check(
      '… which holds the patch and its title',
      got.status === 200 &&
        JSON.stringify(got.json?.patch?.blocks) === JSON.stringify(PATCH.blocks) &&
        got.json?.title === 'From the app',
      got.json?.title,
    );
  },
  /** Acceptance: Share → open in a fresh browser → identical render hash; Overwrite / Create new
   * as v1. */
  async 'share-and-load'(browser) {
    const a = await open(browser, `${base}/?demo`);
    await a.waitForTimeout(1000);
    // The demo's Toggles flip as it plays, and a link keeps them as they are (CHG-0013): the power
    // switch holds them still, so the patch shared is the one rendered here.
    await a.evaluate(() => {
      window.__bd_probe.scene.setWorldPower(false);
    });
    await a.waitForTimeout(500);
    const hashA = await renderHash(a);
    // The share card uses the sharer's colour theme (SPEC-SHARING-BACKEND R9): share from a
    // non-default one.
    const themeBg = await a.evaluate(() => {
      const host = window.__bd_probe.scene.host;
      host.setTheme(3);
      return host.themes()[3].colors[0];
    });
    const url = await shareVia(a, 'generate');
    const id = idOf(url);
    check(
      'generate link → a server id (not a patch token)',
      /^[0-9A-Za-oq-z][0-9A-Za-z]{9}$/.test(id),
      url,
    );
    check(
      'the address bar shows the saved link (v1 AddressBarManager)',
      a.url().includes(`c=${id}`),
      a.url(),
    );
    const token = await editTokenOf(a, id);
    if (id && token) created.push({ id, token });
    // As opened, before START (playing, its Toggles flip too).
    const b = await (await browser.newContext(VIEW)).newPage();
    if (!remote)
      await b.context().route('https://cdn.freesound.org/**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'audio/wav',
          headers: { 'access-control-allow-origin': '*' },
          body: sineWav(440),
        }),
      );
    await b.goto(local(url));
    await b.waitForFunction(() => '__bd_probe' in window && window.__bd_probe.state.patch);
    const [pa, pb] = [await probe(a), await probe(b)];
    check(
      'a fresh browser opens the same patch',
      JSON.stringify(pa.patch.blocks) === JSON.stringify(pb.patch.blocks) &&
        pb.patch.blocks.length > 0,
      pb.patch.blocks.length,
    );
    const hashB = await renderHash(b);
    await b.click('#start');
    await b.waitForFunction(() => window.__bd_probe.state.started, null, {
      timeout: 20000,
    });
    await b.waitForFunction(() => !document.getElementById('start'), null, { timeout: 20000 });
    check(
      '… and renders it identically (offline render hash)',
      hashA.hash === hashB.hash && hashA.peak > 0.001,
      { a: hashA, b: hashB },
    );
    check(
      "the recipient can't overwrite (no edit token: v1 first-session panel)",
      await b.evaluate(() => !window.__bd_probe.v1App.SessionId),
    );

    // Overwrite: change a param in A (the demo's first tone is already at 7, so 5), save over the
    // same id.
    await closeShare(a);
    await transposeTone(a, 5);
    const url2 = await shareVia(a, 'overwrite');
    check('overwrite keeps the id', idOf(url2) === id, url2);
    const loaded = await api('GET', `patches/${id}`);
    check(
      '… and stores a new revision with the change',
      loaded.json?.rev === 2 && hasTranspose(loaded.json, 5),
      loaded.json?.rev,
    );
    await b.reload();
    await b.waitForFunction(() => window.__bd_probe);
    check("the recipient's link shows the overwrite", hasTranspose(await probe(b), 5));

    // Create new (offered once the patch has changed since the link): a new id whose parent is the
    // first.
    await closeShare(a);
    await transposeTone(a, 9);
    const saveAsBefore = await a.evaluate(() => {
      const panel = window.__bd_probe.scene.PatchesPanel;
      panel.OpenPanel();
      const at = panel.centreOf('saveAs');
      if (!at) return false;
      const pixelRatio = window.__bd_probe.v1App.Metrics.PixelRatio;
      panel.HitTests({ x: at[0] * pixelRatio, y: at[1] * pixelRatio });
      const offered =
        (panel as unknown as PatchesPanelState).roll.saveAs && panel.shareState().saveAs;
      panel.ClosePanel();
      return offered;
    });
    check(
      'SAVE AS is offered once the patch has changed since its link (owner, 2026-11-10)',
      saveAsBefore,
    );
    const url3 = await shareVia(a, 'createNew');
    const id3 = idOf(url3);
    check('create new → a new id', !!id3 && id3 !== id, url3);
    // The same patch again can't be saved as yet another link: SAVE AS is gone until something
    // changes.
    const again = await a.evaluate(() => {
      const panel = window.__bd_probe.scene.PatchesPanel,
        at = panel.centreOf('saveAs'),
        pixelRatio = window.__bd_probe.v1App.Metrics.PixelRatio;
      if (at) panel.HitTests({ x: at[0] * pixelRatio, y: at[1] * pixelRatio });
      return { offered: panel.shareState().saveAs, save: panel.shareState().save };
    });
    await press(a, 'saveAs');
    await a.waitForTimeout(1500);
    const url3b = await a.evaluate(() =>
      (document.getElementById('patchUrlText') as HTMLInputElement).value.trim(),
    );
    check(
      '… and then SAVE AS goes until the patch changes again (no repeat links)',
      !again.offered && again.save === null && url3b === url3,
      { again, same: url3b === url3 },
    );
    const g3 = await api('GET', `patches/${id3}`);
    check('… with parent = the original', g3.json?.parent === id, g3.json?.parent);
    const t3 = await editTokenOf(a, id3);
    if (id3 && t3) created.push({ id: id3, token: t3 });

    // The recipient remixes: their first save is a new id with the shared one as parent.
    await closeShare(b);
    const url4 = await shareVia(b, 'generate');
    const g4 = await api('GET', `patches/${idOf(url4)}`);
    check(
      "a recipient's save makes a remix (new id, parent set)",
      idOf(url4) !== id && g4.json?.parent === id,
      { id: idOf(url4), parent: g4.json?.parent },
    );
    const t4 = await editTokenOf(b, idOf(url4));
    if (t4) created.push({ id: idOf(url4), token: t4 });

    // Unsaved edits survive a reload of the creator's own link (autosave wins over the saved
    // version).
    await closeShare(a);
    await a.goto(`${base}/?c=${id}`);
    await a.waitForFunction(() => window.__bd_probe);
    await transposeTone(a, -5);
    await a.waitForTimeout(800);
    await a.reload();
    await a.waitForFunction(() => window.__bd_probe);
    check("reloading the creator's link keeps unsaved edits", hasTranspose(await probe(a), -5));
    check(
      '… and keeps the right to overwrite',
      await a.evaluate(() => !!window.__bd_probe.v1App.SessionId),
    );
    await a.context().close();
    await b.context().close();

    // Link previews for that id.
    const html = await (await fetch(`${base}/?c=${id}`)).text();
    const meta = (property: string) =>
      new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)"`).exec(html)?.[1] ?? null;
    check(
      'share page: Open Graph + twitter tags',
      !!meta('og:title') &&
        !!meta('og:image') &&
        meta('twitter:card') === 'player' &&
        !!meta('twitter:player'),
      { title: meta('og:title'), image: meta('og:image') },
    );
    const saved = (await api('GET', `patches/${id}`)).json?.title ?? null;
    check(
      'share page: og:title is the patch title alone, og:description says what BlokDust is (SPEC-SHARING-BACKEND R9)',
      meta('og:title') === (saved || 'BlokDust') &&
        (meta('og:description') ?? '').startsWith('Connect blocks to make sounds'),
      { title: meta('og:title'), saved, description: meta('og:description') },
    );
    check('share page: oEmbed discovery link', html.includes('type="application/json+oembed"'));
    const img = await fetch(local((meta('og:image') ?? '').replace(/&amp;/g, '&')));
    const png = new Uint8Array(await img.arrayBuffer());
    const dv = new DataView(png.buffer);
    writeFileSync(`${OUT}/thumbnail.png`, png);
    const dims: [number, number] | null =
      png.length > 24 ? [dv.getUint32(16), dv.getUint32(20)] : null;
    check(
      'og:image is the saved PNG thumbnail (1200×630)',
      img.headers.get('content-type') === 'image/png' && dims?.[0] === 1200 && dims[1] === 630,
      { status: img.status, bytes: png.length, dims, url: meta('og:image') },
    );
    // Pixel (0,0) of a PNG is its first row's first bytes whatever the row filter (every predictor
    // is 0 there).
    let off = 8;
    const idat: Uint8Array[] = [];
    while (off < png.length) {
      const uint32 = dv.getUint32(off),
        chunkType = String.fromCharCode(...png.subarray(off + 4, off + 8));
      if (chunkType === 'IDAT') idat.push(png.subarray(off + 8, off + 8 + uint32));
      off += 12 + uint32;
    }
    const raw = inflateSync(Buffer.concat(idat));
    const corner =
      '#' + [raw[1], raw[2], raw[3]].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    check(
      "og:image is drawn in the sharer's colour theme (theme 3's background)",
      [raw[1], raw[2], raw[3]].join() === (themeBg.match(/\d+/g) ?? []).slice(0, 3).join(),
      { corner, themeBg },
    );
    const oembed = (await (
      await fetch(`${base}/oembed?url=${encodeURIComponent(`${base}/?c=${id}`)}&maxwidth=480`)
    ).json()) as { type: string; version: string; width: number; height: number; html: string };
    check(
      '/oembed: rich JSON with an iframe to /embed/<id>, maxwidth respected',
      oembed.type === 'rich' &&
        oembed.version === '1.0' &&
        oembed.width === 480 &&
        oembed.height === 300 &&
        new RegExp(`/embed/${id}"`).test(oembed.html),
      oembed,
    );
    check(
      '/oembed: other sites → 404',
      (await fetch(`${base}/oembed?url=${encodeURIComponent('https://example.com/?c=' + id)}`))
        .status === 404,
    );
    handoff.sharedId = id;
  },
};
