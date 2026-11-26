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
  editTokenOf,
  madePatch,
  hasTranspose,
} from './harness.ts';
import { located } from '../located.ts';
import type { MessageBarState } from '../pageGlobals.ts';

export const savingTests: SharingTests = {
  /** A link to no patch: the message bar says why, the stage starts blank, the link leaves the
   * address bar and the autosave is kept; deleted patches answer 410 (SPEC-SHARING-BACKEND R4b). */
  async 'missing-links'(browser) {
    if (remote) return;
    const made = madePatch(
      await api('POST', 'patches', {
        patch: PATCH,
        turnstile: 'XXXX.DUMMY.TOKEN.XXXX',
        title: 'Soon gone',
      }),
    );
    const del = await api('DELETE', `patches/${made.id}`, undefined, made.token);
    const gone = await api('GET', `patches/${made.id}`);
    check(
      'a deleted patch answers 410; one that never was, 404',
      del.status === 204 &&
        gone.status === 410 &&
        (await api('GET', 'patches/A000000000')).status === 404,
      [del.status, gone.status],
    );
    const page = await open(browser, `${base}/?demo`);
    // This browser's last stage (its autosave), as a visit without a link would restore it.
    const autosave = await page.evaluate((patch) => {
      localStorage.setItem('blokdust2.autosave', JSON.stringify(patch));
      return localStorage.getItem('blokdust2.autosave');
    }, PATCH);
    const cases: [string, RegExp][] = [
      ['madeUpId', /doesn.t lead to a patch/i],
      ['A000000000', /doesn.t lead to a patch/i],
      [made.id, /has been deleted/i],
    ];
    const seen: unknown[] = [];
    let ok = !!autosave;
    for (const [id, want] of cases) {
      await page.goto(`${base}/?c=${id}&t=Whatever`);
      await page.waitForFunction(() => window.__bd_probe);
      if (await page.$('#start')) await page.click('#start');
      await page.waitForFunction(() => window.__bd_probe.state.started, null, {
        timeout: 20000,
      });
      await page
        .waitForFunction(() => window.__bd_probe.scene.MessagePanel.Open, null, {
          timeout: 8000,
        })
        .catch(() => {});
      const shown = await page.evaluate(() => {
        const scene = window.__bd_probe.scene;
        return {
          text: (scene.MessagePanel as unknown as MessageBarState)._Value?.string ?? '',
          blocks: scene.host.hasBlocks(),
          url: location.search,
          autosave: localStorage.getItem('blokdust2.autosave'),
        };
      });
      seen.push({ id, ...shown, autosave: shown.autosave === autosave });
      ok &&=
        want.test(shown.text) &&
        !shown.blocks &&
        !shown.url.includes('c=') &&
        shown.autosave === autosave;
    }
    await page.context().close();
    check(
      'a bad, unknown or deleted link: the message bar says which, a blank stage, the link leaves the address bar, the autosave is kept',
      ok,
      seen,
    );
  },

  /** CHG-0033, R18–R20: Cmd/Ctrl+S and the corner's SAVE save over your own link; the corner marks
   * unsaved changes, which survive a reload; a failed save says so and changes nothing. */
  async 'quick-save'(browser) {
    const a = await open(browser, `${base}/?demo`);
    await a.evaluate(() => {
      window.__bd_probe.scene.setWorldPower(false);
    });
    const corner = () =>
      a.evaluate(
        () =>
          window.__bd_probe.corners as {
            own: { title: string; dirty: boolean; saving: boolean; hover: boolean } | null;
            saveAt: [number, number] | null;
          },
      );
    const msg = () =>
      a.evaluate(() => {
        const messagePanel = window.__bd_probe.scene.MessagePanel as unknown as MessageBarState;
        return {
          open: messagePanel.Open,
          shown: messagePanel._Alpha > 0,
          text: messagePanel._Value?.string,
        };
      });
    const puts: { url: string; body: { title?: string; gallery?: unknown } }[] = [];
    a.on('request', (request) => {
      if (request.url().includes('/api/patches') && request.method() !== 'GET')
        puts.push({
          url: `${request.method()} ${request.url().replace(/^.*\/api\//, '')}`,
          body: JSON.parse(request.postData() ?? '{}') as { title?: string },
        });
    });
    const transpose = (semitones: number) =>
      a.evaluate((value) => {
        const probe = window.__bd_probe;
        const tone = probe.state.blocks.find((block) => block.type === 'source.tone');
        if (!tone) throw new Error('no Tone on the stage');
        probe.scene.host.setParam(tone.id, 'transpose', value);
      }, semitones);
    const key = async () => {
      await a.keyboard.press('ControlOrMeta+s');
    };
    const settled = () =>
      a
        .waitForFunction(
          () => {
            const own = window.__bd_probe.corners.own;
            return own && !own.saving && !own.dirty;
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
        const panel = window.__bd_probe.scene.PatchesPanel;
        return panel.Open && panel.Tab === 0;
      })) &&
        puts.length === 0 &&
        (await corner()).own === null,
    );
    const title = await a.evaluate(() => window.__bd_probe.scene.PatchesPanel.Title.trim());
    const url = await shareVia(a, 'generate'),
      id = idOf(url);
    const token = await editTokenOf(a, id);
    if (id && token) created.push({ id, token });
    await closeShare(a);
    const c0 = await corner();
    await a.screenshot({ path: `${OUT}/quick-save-clean.png` });
    check(
      'R19: your saved link: the corner names it, nothing unsaved',
      c0.own?.title === title && !c0.own.dirty && !c0.saveAt,
      c0,
    );

    await transpose(5);
    await a.waitForTimeout(800);
    const c1 = await corner();
    await a.mouse.move(640, 600);
    await a.waitForTimeout(200);
    await a.screenshot({ path: `${OUT}/quick-save-unsaved.png` });
    check('R19: a change marks it UNSAVED', !!c1.own?.dirty && !!c1.saveAt, c1);
    const saveAt = located(c1.saveAt, 'the corner SAVE');
    await a.mouse.move(saveAt[0], saveAt[1]);
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
        g1.json.title === title &&
        hasTranspose(g1.json, 5) &&
        idOf(a.url()) === id &&
        !(await a.evaluate(() => window.__bd_probe.scene.PatchesPanel.Open)),
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
    const cornerSave = located(c2.saveAt, 'the corner SAVE');
    await a.mouse.move(cornerSave[0], cornerSave[1]);
    await a.mouse.click(cornerSave[0], cornerSave[1]);
    await settled();
    const g2 = await api('GET', `patches/${id}`);
    check(
      'R19: pressing SAVE in the corner saves over the link',
      g2.json?.rev === 3 && hasTranspose(g2.json, 3),
      g2.json?.rev,
    );

    // A failed save says so, keeps the link and the unsaved mark (R18: never a new self-contained
    // link).
    await transpose(4);
    await a.waitForTimeout(800);
    await a.route('**/api/patches/**', (route) =>
      route.request().method() === 'PUT'
        ? route.fulfill({ status: 500, body: '{}' })
        : route.continue(),
    );
    await a.waitForTimeout(3500);
    await key();
    await a
      .waitForFunction(() => !window.__bd_probe.corners.own?.saving, null, {
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
    await a.waitForFunction(() => window.__bd_probe);
    await a.click('#start');
    await a.waitForFunction(() => window.__bd_probe.state.started, null, {
      timeout: 20000,
    });
    await a.waitForTimeout(1500);
    const c4 = await corner(),
      kept = hasTranspose(await probe(a), 4);
    check(
      'R20: after a reload the unsaved edit is back and marked UNSAVED',
      kept && c4.own?.title === title && c4.own.dirty,
      { kept, own: c4.own },
    );
    await a.context().close();
  },
};
