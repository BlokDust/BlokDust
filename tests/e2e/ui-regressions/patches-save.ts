// ui-regressions: Patches › SAVE: names, files, the picker and quick save.
import { OUT, blk, browser, comp, open, type RegressionTest, url } from './harness.ts';
import { makeLink, openPatches, patchesClick } from './patchesPanel.ts';

export const patchesSaveTests: Record<string, RegressionTest> = {
  async 'patches-tab-remembered'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    const tab = () => p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Tab);
    await openPatches(p);
    const first = await tab();
    await patchesClick(p, 'tab1', 600);
    await patchesClick(p, 'close', 800);
    await openPatches(p, true);
    const reopened = await tab();
    const fill = await p.evaluate(() => {
      const pp = (window as any).__bd_probe.scene.PatchesPanel,
        app = (window as any).__bd_probe.v1App,
        [x, y] = pp.centreOf('file');
      const canvas = document.querySelector('canvas')!,
        pr = app.Metrics.PixelRatio;
      const probe = document.createElement('canvas');
      probe.width = canvas.width;
      probe.height = canvas.height;
      const ctx = probe.getContext('2d')!;
      ctx.drawImage(canvas, 0, 0);
      const px = Array.from(
        ctx
          .getImageData(Math.round((x - 190) * pr), Math.round((y - 12) * pr), 1, 1)
          .data.slice(0, 3),
      );
      const w = document.createElement('canvas').getContext('2d')!;
      w.fillStyle = app.Palette[app.ThemeManager.MenuOrder[3]];
      w.fillRect(0, 0, 1, 1);
      return { px, want: Array.from(w.getImageData(0, 0, 1, 1).data.slice(0, 3)) };
    });
    await p.screenshot({ path: `${OUT}/patches-open-tab.png` });
    await p.reload();
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForTimeout(2000);
    await openPatches(p, true);
    const reloaded = await tab();
    await patchesClick(p, 'tab0', 600);
    await patchesClick(p, 'close', 800);
    await openPatches(p, true);
    const back = await tab();
    await p.close();
    // OPEN FROM YOUR DEVICE is a small bordered button now (owner, 2026-11-18), not the wide filled one: 190 px left of
    // its centre is the panel, not the button's colour.
    const small = !fill.px.every((v: number, i: number) => Math.abs(v - fill.want[i]) <= 3);
    const ok = first === 0 && reopened === 1 && reloaded === 1 && back === 0 && small;
    return [ok, { first, reopened, reloaded, back, fill }];
  },
  /** Owner (2026-11-18): own patches don't share a name; a new link with a name already used gets " (2)", shown in the
   * name field. Saving over the same link keeps its name. */
  async 'save-names-unique'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.setTitle('Song'));
    await makeLink(p);
    const t1 = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Title);
    await patchesClick(p, 'close', 900);
    await p.evaluate(() => (window as any).__bd_probe.scene.host.createBlock('ToneSource', 4, 4));
    await p.waitForTimeout(300);
    await openPatches(p);
    await patchesClick(p, 'saveAs', 200);
    await p.waitForFunction(() => !(window as any).__bd_probe.scene.PatchesPanel.Saving, null, {
      timeout: 20000,
    });
    await p.waitForTimeout(300);
    const t2 = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Title);
    const titles = await p.evaluate(() =>
      JSON.parse(localStorage.getItem('blokdust.myPatches') ?? '[]').map(
        (m: { title: string }) => m.title,
      ),
    );
    await p.close();
    return [
      t1 === 'Song' && t2 === 'Song (2)' && titles.includes('Song') && titles.includes('Song (2)'),
      { t1, t2, titles },
    ];
  },
  /** Owner (2026-11-10): a patch name keeps "+" and other symbols (v1's title field stripped punctuation, because the
   * title went into the link unescaped; the presets themselves are named "… + …"). */
  async 'patch-title-plus'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await openPatches(p);
    await p.evaluate(() => {
      const i = document.getElementById('patchTitleInput') as HTMLInputElement;
      i.value = '';
    });
    await p.click('#patchTitleInput');
    await p.keyboard.type('Bass + Bells (2) & co.');
    const r = await p.evaluate(() => ({
      field: (document.getElementById('patchTitleInput') as HTMLInputElement).value,
      title: (window as any).__bd_probe.scene.PatchesPanel.Title,
    }));
    await p.close();
    return [r.field === 'Bass + Bells (2) & co.' && r.title === r.field, r];
  },
  // ---- Quick save (CHG-0033, owner 2026-11-17; SPEC-SHARING-BACKEND R18) ----
  /** Cmd/Ctrl+S with no link of this browser's own (here: no backend, a v1 composition) opens Patches › SAVE, and the
   * browser's "Save page" never opens (the key is cancelled), also while typing in a field. No corner line. */
  async 'quick-save-no-link-opens-save'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await p.evaluate(() => {
      try {
        localStorage.setItem('blokdust.patchesTab', '1');
      } catch {
        /* */
      }
    }); // last tab OPEN: Cmd+S still shows SAVE
    await p.evaluate(() => {
      window.addEventListener('keydown', (event) => {
        (window as any).__prevented = event.defaultPrevented;
      });
    });
    await p.keyboard.press('ControlOrMeta+s');
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => {
      const s = (window as any).__bd_probe,
        pp = s.scene.PatchesPanel;
      return {
        open: pp.Open,
        tab: pp.Tab,
        prevented: (window as any).__prevented,
        own: s.corners.own,
        saving: pp.Saving,
      };
    });
    await p.screenshot({ path: `${OUT}/quick-save-no-link.png` });
    // Typing in the title field: still cancelled (and the panel stays on SAVE).
    await p.click('#patchTitleInput');
    await p.evaluate(() => {
      (window as any).__prevented = null;
    });
    await p.keyboard.press('ControlOrMeta+s');
    await p.waitForTimeout(400);
    const typing = await p.evaluate(() => ({
      prevented: (window as any).__prevented,
      open: (window as any).__bd_probe.scene.PatchesPanel.Open,
      tab: (window as any).__bd_probe.scene.PatchesPanel.Tab,
    }));
    await p.close();
    return [
      r.open &&
        r.tab === 0 &&
        r.prevented === true &&
        r.own === null &&
        !r.saving &&
        typing.prevented === true &&
        typing.open &&
        typing.tab === 0,
      { r, typing },
    ];
  },
  /** Owner (2026-11-10): the sample panel's file button reads UPLOAD FILE with the upload mark, and text buttons like it
   * (and OPEN FROM YOUR DEVICE) are underlined on hover, so they read as buttons. */
  async 'upload-file-button'(errors: string[]) {
    const p = await open(browser, [blk(1, 'Sample', 0, 0)], errors);
    await p.mouse.click(640, 402);
    await p.waitForTimeout(1000); // the Sample: its options panel
    await p.evaluate(() => {
      const seen: string[] = ((window as any).__texts = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) {
        seen.push(t);
        return (f as any).call(this, t, ...a);
      };
    });
    await p.mouse.move(941, 443);
    await p.mouse.click(941, 443);
    await p.waitForTimeout(1200); // LOAD NEW SAMPLE → the search panel
    const r = await p.evaluate(() => {
      const s = (window as any).__bd_probe.scene,
        x = s.fileButtonRect(),
        pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio;
      return { x: x.x / pr, y: x.y / pr, w: x.w / pr, h: x.h / pr, open: s.SoundcloudPanel.Open };
    });
    const clip = { x: r.x - 10, y: r.y, width: r.w + 20, height: r.h };
    await p.mouse.move(r.x - 200, r.y - 100);
    await p.waitForTimeout(300);
    const idle = await p.screenshot({ clip });
    await p.mouse.move(r.x + r.w / 2, r.y + 20);
    await p.waitForTimeout(300);
    const hover = await p.screenshot({ clip });
    await p.screenshot({ path: `${OUT}/upload-file-button.png` });
    const texts = await p.evaluate(() =>
      (window as any).__texts.filter((__text: string) => __text.includes('FILE')).slice(0, 3),
    );
    await p.close();
    const ok =
      r.open &&
      texts.includes('UPLOAD FILE') &&
      !texts.includes('YOUR FILE') &&
      !idle.equals(hover);
    return [ok, { open: r.open, texts, hoverChangesIt: !idle.equals(hover) }];
  },
  /** Owner (2026-11-10): SAVE TO COMPUTER lets the user pick where. Where the browser has a save dialog it is used,
   * starting in Music (browsers can't open a sub-folder that the page hasn't been given) and remembering the folder
   * last used for patches (`id`). */
  async 'save-picker'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await p.evaluate(() => {
      (window as any).__written = [];
      (window as any).showSaveFilePicker = async (o: any) => {
        (window as any).__opts = o;
        return {
          createWritable: async () => ({
            write: async (t: string) => (window as any).__written.push(t),
            close: async () => {},
          }),
        };
      };
    });
    await openPatches(p);
    await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.setTitle('Bass + Bells'));
    await patchesClick(p, 'save', 600);
    const r = await p.evaluate(() => ({
      opts: (window as any).__opts,
      file: JSON.parse((window as any).__written[0] ?? '{}'),
      saved: (window as any).__bd_probe.scene.PatchesPanel.flashing('save'),
    }));
    // Cancelling the dialog saves nothing and says nothing.
    await p.evaluate(() => {
      (window as any).showSaveFilePicker = async () => {
        throw new DOMException('cancelled', 'AbortError');
      };
    });
    await p.waitForTimeout(1800);
    await patchesClick(p, 'save', 400);
    const cancelled = await p.evaluate(() =>
      (window as any).__bd_probe.scene.PatchesPanel.flashing('save'),
    );
    await p.close();
    const ok =
      r.opts?.startIn === 'music' &&
      r.opts?.id === 'blokdust-patches' &&
      r.opts?.suggestedName === 'Bass + Bells.blokdust' &&
      r.file.meta?.title === 'Bass + Bells' &&
      r.file.blocks?.length === 1 &&
      r.saved === true &&
      cancelled === false;
    return [ok, { opts: r.opts, title: r.file.meta?.title, saved: r.saved, cancelled }];
  },
  /** Owner review 2 (option A, 2026-11-15): DOWNLOAD PATCH is a quiet bordered button at the bottom right (it was a
   * filled button in v1's third options colour, owner 2026-11-11), and phones don't offer it. */
  async 'download-quiet'(errors: string[]) {
    const at = async (phone: boolean) => {
      const ctx = await browser.newContext({
        viewport: phone ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        isMobile: phone,
        hasTouch: phone,
      });
      const p = await ctx.newPage();
      p.on('pageerror', (e) => errors.push(e.message));
      await p.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
      await p.waitForFunction(() => (window as any).__bd_probe);
      await p.click('#start');
      await p.waitForTimeout(1500);
      await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.OpenPanel(0));
      await p.waitForTimeout(1200);
      const r = await p.evaluate(() => {
        const pp = (window as any).__bd_probe.scene.PatchesPanel;
        return {
          main: pp.centreOf('share'),
          download: pp.centreOf('save'),
          saveAs: pp.centreOf('saveAs'),
        };
      });
      if (!phone) await p.screenshot({ path: `${OUT}/save-tab-option-a.png` });
      await ctx.close();
      return r;
    };
    const desk = await at(false),
      phone = await at(true);
    const ok =
      !!desk.download &&
      desk.download[1] > desk.main[1] + 50 &&
      desk.download[0] > desk.main[0] &&
      !phone.download &&
      !!phone.saveAs;
    return [ok, { desk, phone }];
  },
};
