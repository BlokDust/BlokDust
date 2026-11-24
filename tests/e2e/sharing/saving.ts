// Links to no patch, and quick save over your own link (CHG-0033), run by tests/e2e/sharing.ts.
import {
  type SharingTests,
  remote,
  created,
  base,
  check,
  probe,
  OUT,
  api,
  PATCH,
  open,
  shareVia,
  idOf,
  closeShare,
} from './harness.ts';

export const savingTests: SharingTests = {
  /** Acceptance: Share → open in a fresh browser → identical render hash; Overwrite / Create new as v1. */
  /** CHG-0033 (owner, 2026-11-17), R18–R20: Cmd/Ctrl+S and the corner's UNSAVED/SAVE save over your own link (same
   * id and title, no gallery field, no panel) and v1's message bar says SAVED; the corner names the patch and marks
   * unsaved changes, which survive a reload; a failed save says so and changes nothing. */
  /** Owner (2026-11-18): a link to no patch opened this browser's last stage (a made-up id) or an empty one, with no
   * word. Now the message bar says why and the stage starts blank; the bad link leaves the address bar; this browser's
   * autosave is kept. Deleted patches answer 410 (SPEC-SHARING-BACKEND R4b). */
  async 'missing-links'(browser) {
    if (remote) return;
    const made = await api('POST', 'patches', {
      patch: PATCH,
      turnstile: 'XXXX.DUMMY.TOKEN.XXXX',
      title: 'Soon gone',
    });
    const del = await api('DELETE', `patches/${made.json.id}`, undefined, made.json.editToken);
    const gone = await api('GET', `patches/${made.json.id}`);
    check(
      'a deleted patch answers 410; one that never was, 404',
      del.status === 204 &&
        gone.status === 410 &&
        (await api('GET', 'patches/A000000000')).status === 404,
      [del.status, gone.status],
    );
    const page = await open(browser, `${base}/?demo`);
    // This browser's last stage (its autosave), as a visit without a link would restore it.
    const autosave = await page.evaluate((p) => {
      localStorage.setItem('blokdust2.autosave', JSON.stringify(p));
      return localStorage.getItem('blokdust2.autosave');
    }, PATCH);
    const cases: [string, RegExp][] = [
      ['madeUpId', /doesn.t lead to a patch/i],
      ['A000000000', /doesn.t lead to a patch/i],
      [made.json.id, /has been deleted/i],
    ];
    const seen: unknown[] = [];
    let ok = !!autosave;
    for (const [id, want] of cases) {
      await page.goto(`${base}/?c=${id}&t=Whatever`);
      await page.waitForFunction(() => (window as any).__bd_probe);
      if (await page.$('#start')) await page.click('#start');
      await page.waitForFunction(() => (window as any).__bd_probe.state.started, null, {
        timeout: 20000,
      });
      await page
        .waitForFunction(() => (window as any).__bd_probe.scene.MessagePanel.Open, null, {
          timeout: 8000,
        })
        .catch(() => {});
      const r = await page.evaluate(() => {
        const w = window as any;
        return {
          text: String(w.__bd_probe.scene.MessagePanel._Value?.string ?? ''),
          blocks: w.__bd_probe.scene.host.hasBlocks(),
          url: location.search,
          autosave: localStorage.getItem('blokdust2.autosave'),
        };
      });
      seen.push({ id, ...r, autosave: r.autosave === autosave });
      ok &&= want.test(r.text) && !r.blocks && !r.url.includes('c=') && r.autosave === autosave;
    }
    await page.context().close();
    check(
      'a bad, unknown or deleted link: the message bar says which, a blank stage, the link leaves the address bar, the autosave is kept',
      ok,
      seen,
    );
  },

  async 'quick-save'(browser) {
    const a = await open(browser, `${base}/?demo`);
    await a.evaluate(() => (window as any).__bd_probe.scene.setWorldPower(false));
    const corner = () =>
      a.evaluate(
        () =>
          (window as any).__bd_probe.corners as {
            own: { title: string; dirty: boolean; saving: boolean; hover: boolean } | null;
            saveAt: [number, number] | null;
          },
      );
    const msg = () =>
      a.evaluate(() => {
        const messagePanel = (window as any).__bd_probe.scene.MessagePanel;
        return {
          open: messagePanel.Open,
          shown: messagePanel._Alpha > 0,
          text: messagePanel._Value?.string,
        };
      });
    const puts: { url: string; body: any }[] = [];
    a.on('request', (r) => {
      if (r.url().includes('/api/patches') && r.method() !== 'GET')
        puts.push({
          url: `${r.method()} ${r.url().replace(/^.*\/api\//, '')}`,
          body: JSON.parse(r.postData() ?? '{}'),
        });
    });
    const transpose = (v: number) =>
      a.evaluate((n) => {
        const s = (window as any).__bd_probe;
        const t = s.state.blocks.find((x: any) => x.type === 'source.tone');
        s.scene.host.setParam(t.id, 'transpose', n);
      }, v);
    const key = async () => {
      await a.keyboard.press('ControlOrMeta+s');
    };
    const settled = () =>
      a
        .waitForFunction(
          () => {
            const o = (window as any).__bd_probe.corners.own;
            return o && !o.saving && !o.dirty;
          },
          null,
          { timeout: 30000 },
        )
        .catch(() => {});

    // Never saved: the key opens Patches › SAVE (R18) and saves nothing.
    await key();
    await a.waitForTimeout(1200);
    check(
      'R18: no link of your own: Cmd/Ctrl+S opens Patches › SAVE, saves nothing',
      (await a.evaluate(() => {
        const pp = (window as any).__bd_probe.scene.PatchesPanel;
        return pp.Open && pp.Tab === 0;
      })) &&
        puts.length === 0 &&
        (await corner()).own === null,
    );
    const title = await a.evaluate(() =>
      (window as any).__bd_probe.scene.PatchesPanel.Title.trim(),
    );
    const url = await shareVia(a, 'generate'),
      id = idOf(url);
    const token = await a.evaluate(
      (i) => JSON.parse(localStorage.getItem('blokdust2.editTokens') ?? '{}')[i],
      id,
    );
    if (id && token) created.push({ id, token });
    await closeShare(a);
    const c0 = await corner();
    await a.screenshot({ path: `${OUT}/quick-save-clean.png` });
    check(
      'R19: your saved link: the corner names it, nothing unsaved',
      c0.own?.title === title && !c0.own?.dirty && !c0.saveAt,
      c0,
    );

    await transpose(5);
    await a.waitForTimeout(800);
    const c1 = await corner();
    await a.mouse.move(640, 600);
    await a.waitForTimeout(200);
    await a.screenshot({ path: `${OUT}/quick-save-unsaved.png` });
    check('R19: a change marks it UNSAVED', !!c1.own?.dirty && !!c1.saveAt, c1);
    await a.mouse.move(c1.saveAt![0], c1.saveAt![1]);
    await a.waitForTimeout(300);
    const hover = await corner();
    await a.screenshot({ path: `${OUT}/quick-save-hover.png` });
    check('R19: under the mouse it reads SAVE', !!hover.own?.hover, hover.own);
    await a.mouse.move(640, 600);
    await a.waitForTimeout(200);

    puts.length = 0;
    await key();
    await settled();
    await a.waitForTimeout(300);
    const m1 = await msg(),
      g1 = await api('GET', `patches/${id}`);
    await a.screenshot({ path: `${OUT}/quick-save-saved.png` });
    check(
      'R18: Cmd/Ctrl+S saves over the same link (no panel, no gallery change)',
      puts.length === 1 &&
        puts[0].url === `PUT patches/${id}` &&
        !('gallery' in puts[0].body) &&
        puts[0].body.title === title &&
        g1.json?.rev === 2 &&
        g1.json?.title === title &&
        g1.json?.patch?.blocks?.some((x: any) => x.params?.transpose === 5) &&
        idOf(a.url()) === id &&
        !(await a.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Open)),
      { puts: puts.map((put) => put.url), rev: g1.json?.rev, title: g1.json?.title, at: a.url() },
    );
    check(
      'R18: v1 message bar says SAVED; the corner is clean again',
      m1.open && m1.shown && m1.text === 'Saved' && (await corner()).own?.dirty === false,
      m1,
    );

    // Nothing changed: SAVED again, no request.
    puts.length = 0;
    await a.waitForTimeout(3500);
    await key();
    await a.waitForTimeout(600);
    check(
      'R18: no changes: SAVED shows, nothing is sent',
      puts.length === 0 && (await msg()).open,
      puts,
    );

    // The corner's SAVE saves too.
    await transpose(3);
    await a.waitForTimeout(800);
    const c2 = await corner();
    await a.mouse.move(c2.saveAt![0], c2.saveAt![1]);
    await a.mouse.click(c2.saveAt![0], c2.saveAt![1]);
    await settled();
    const g2 = await api('GET', `patches/${id}`);
    check(
      'R19: pressing SAVE in the corner saves over the link',
      g2.json?.rev === 3 && g2.json?.patch?.blocks?.some((x: any) => x.params?.transpose === 3),
      g2.json?.rev,
    );

    // A failed save says so, keeps the link and the unsaved mark (R18: never a new self-contained link).
    await transpose(4);
    await a.waitForTimeout(800);
    await a.route('**/api/patches/**', (r) =>
      r.request().method() === 'PUT' ? r.fulfill({ status: 500, body: '{}' }) : r.continue(),
    );
    await a.waitForTimeout(3500);
    await key();
    await a
      .waitForFunction(() => !(window as any).__bd_probe.corners.own?.saving, null, {
        timeout: 30000,
      })
      .catch(() => {});
    const m3 = await msg(),
      c3 = await corner();
    check(
      'R18: a failed save says so; same link, still UNSAVED',
      m3.open &&
        /failed/i.test(m3.text ?? '') &&
        !!c3.own?.dirty &&
        idOf(a.url()) === id &&
        (await api('GET', `patches/${id}`)).json?.rev === 3,
      { m3, own: c3.own, at: a.url() },
    );
    await a.unroute('**/api/patches/**');

    // R20: unsaved edits survive a reload and still show as UNSAVED.
    await a.reload();
    await a.waitForFunction(() => (window as any).__bd_probe);
    await a.click('#start');
    await a.waitForFunction(() => (window as any).__bd_probe.state.started, null, {
      timeout: 20000,
    });
    await a.waitForTimeout(1500);
    const c4 = await corner(),
      kept = (await probe(a)).patch.blocks.some((x: any) => x.params?.transpose === 4);
    check(
      'R20: after a reload the unsaved edit is back and marked UNSAVED',
      kept && c4.own?.title === title && !!c4.own?.dirty,
      { kept, own: c4.own },
    );
    await a.context().close();
  },
};
