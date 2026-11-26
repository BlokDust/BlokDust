// ui-regressions: Patches › SAVE: names, files, the picker and quick save.
import { OUT, blk, browser, comp, open, type RegressionTest, url } from './harness.ts';
import { makeLink, openPatches, patchesClick } from './patchesPanel.ts';
import type { SceneFileButton } from './v1Views.ts';

export const patchesSaveTests: Record<string, RegressionTest> = {
  /** Patches opens on the tab last chosen, also after a reload; OPEN FROM YOUR DEVICE is a small
   * bordered button on the OPEN tab. */
  async 'patches-tab-remembered'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    const tab = () => page.evaluate(() => window.__bd_probe.scene.PatchesPanel.Tab);
    await openPatches(page);
    const first = await tab();
    await patchesClick(page, 'tab1', 600);
    await patchesClick(page, 'close', 800);
    await openPatches(page, true);
    const reopened = await tab();
    const fill = await page.evaluate(() => {
      const pp = window.__bd_probe.scene.PatchesPanel,
        app = window.__bd_probe.v1App,
        centre = pp.centreOf('file'),
        canvas = document.querySelector('canvas'),
        probe = document.createElement('canvas');
      if (!centre || !canvas) throw new Error('no file button or canvas');
      const [x, y] = centre,
        pr = app.Metrics.PixelRatio;
      probe.width = canvas.width;
      probe.height = canvas.height;
      const ctx = probe.getContext('2d'),
        swatch = document.createElement('canvas').getContext('2d');
      if (!ctx || !swatch) throw new Error('no 2D canvas');
      ctx.drawImage(canvas, 0, 0);
      const px = Array.from(
        ctx
          .getImageData(Math.round((x - 190) * pr), Math.round((y - 12) * pr), 1, 1)
          .data.slice(0, 3),
      );
      swatch.fillStyle = app.Palette[app.ThemeManager.MenuOrder[3]];
      swatch.fillRect(0, 0, 1, 1);
      return { px, want: Array.from(swatch.getImageData(0, 0, 1, 1).data.slice(0, 3)) };
    });
    await page.screenshot({ path: `${OUT}/patches-open-tab.png` });
    await page.reload();
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForTimeout(2000);
    await openPatches(page, true);
    const reloaded = await tab();
    await patchesClick(page, 'tab0', 600);
    await patchesClick(page, 'close', 800);
    await openPatches(page, true);
    const back = await tab();
    await page.close();
    // A small bordered button, not the wide filled one: 190 px left of its centre is the panel.
    const small = !fill.px.every((channel, i) => Math.abs(channel - fill.want[i]) <= 3);
    const ok = first === 0 && reopened === 1 && reloaded === 1 && back === 0 && small;
    return [ok, { first, reopened, reloaded, back, fill }];
  },
  /** Own patches don't share a name: a new link with a used name gets " (2)", shown in the name
   * field; saving over the same link keeps its name. */
  async 'save-names-unique'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await page.evaluate(() => {
      window.__bd_probe.scene.PatchesPanel.setTitle('Song');
    });
    await makeLink(page);
    const t1 = await page.evaluate(() => window.__bd_probe.scene.PatchesPanel.Title);
    await patchesClick(page, 'close', 900);
    await page.evaluate(() => {
      window.__bd_probe.scene.host.createBlock('ToneSource', 4, 4);
    });
    await page.waitForTimeout(300);
    await openPatches(page);
    await patchesClick(page, 'saveAs', 200);
    await page.waitForFunction(() => !window.__bd_probe.scene.PatchesPanel.Saving, null, {
      timeout: 20000,
    });
    await page.waitForTimeout(300);
    const t2 = await page.evaluate(() => window.__bd_probe.scene.PatchesPanel.Title);
    const titles = await page.evaluate(() =>
      (JSON.parse(localStorage.getItem('blokdust.myPatches') ?? '[]') as { title: string }[]).map(
        (mine) => mine.title,
      ),
    );
    await page.close();
    return [
      t1 === 'Song' && t2 === 'Song (2)' && titles.includes('Song') && titles.includes('Song (2)'),
      { t1, t2, titles },
    ];
  },
  /** A patch name keeps "+" and other symbols (v1 stripped punctuation, because the title went into
   * the link unescaped; the presets are named "… + …"). */
  async 'patch-title-plus'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await openPatches(page);
    await page.evaluate(() => {
      const input = document.getElementById('patchTitleInput') as HTMLInputElement;
      input.value = '';
    });
    await page.click('#patchTitleInput');
    await page.keyboard.type('Bass + Bells (2) & co.');
    const result = await page.evaluate(() => ({
      field: (document.getElementById('patchTitleInput') as HTMLInputElement).value,
      title: window.__bd_probe.scene.PatchesPanel.Title,
    }));
    await page.close();
    return [result.field === 'Bass + Bells (2) & co.' && result.title === result.field, result];
  },
  // CHG-0033, SPEC-SHARING-BACKEND R18
  /** Cmd/Ctrl+S with no link of this browser's own opens Patches › SAVE and never the browser's
   * "Save page" (the key is cancelled), also while typing in a field. No corner line. */
  async 'quick-save-no-link-opens-save'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    // Last tab OPEN: Cmd+S still shows SAVE.
    await page.evaluate(() => {
      try {
        localStorage.setItem('blokdust.patchesTab', '1');
      } catch {
        /* */
      }
    });
    await page.evaluate(() => {
      window.addEventListener('keydown', (event) => {
        window.__prevented = event.defaultPrevented;
      });
    });
    await page.keyboard.press('ControlOrMeta+s');
    await page.waitForTimeout(1200);
    const result = await page.evaluate(() => {
      const probe = window.__bd_probe,
        pp = probe.scene.PatchesPanel;
      return {
        open: pp.Open,
        tab: pp.Tab,
        prevented: window.__prevented,
        own: probe.corners.own,
        saving: pp.Saving,
      };
    });
    await page.screenshot({ path: `${OUT}/quick-save-no-link.png` });
    // Typing in the title field: still cancelled (and the panel stays on SAVE).
    await page.click('#patchTitleInput');
    await page.evaluate(() => {
      window.__prevented = null;
    });
    await page.keyboard.press('ControlOrMeta+s');
    await page.waitForTimeout(400);
    const typing = await page.evaluate(() => ({
      prevented: window.__prevented,
      open: window.__bd_probe.scene.PatchesPanel.Open,
      tab: window.__bd_probe.scene.PatchesPanel.Tab,
    }));
    await page.close();
    return [
      result.open &&
        result.tab === 0 &&
        result.prevented === true &&
        result.own === null &&
        !result.saving &&
        typing.prevented === true &&
        typing.open &&
        typing.tab === 0,
      { r: result, typing },
    ];
  },
  /** The sample panel's file button reads UPLOAD FILE with the upload mark; text buttons like it
   * are underlined on hover, so they read as buttons. */
  async 'upload-file-button'(errors: string[]) {
    const page = await open(browser, [blk(1, 'Sample', 0, 0)], errors);
    await page.mouse.click(640, 402);
    await page.waitForTimeout(1000); // the Sample: its options panel
    await page.evaluate(() => {
      const seen: string[] = (window.__texts = []);
      const proto = CanvasRenderingContext2D.prototype,
        drawText = Object.getOwnPropertyDescriptor(proto, 'fillText')
          ?.value as typeof proto.fillText;
      proto.fillText = function (text: string, ...rest: [number, number, number?]) {
        seen.push(text);
        drawText.call(this, text, ...rest);
      };
    });
    await page.mouse.move(941, 443);
    await page.mouse.click(941, 443);
    await page.waitForTimeout(1200); // LOAD NEW SAMPLE → the search panel
    const result = await page.evaluate(() => {
      const scene = window.__bd_probe.scene,
        x = (scene as unknown as SceneFileButton).fileButtonRect(),
        pr = window.__bd_probe.v1App.Metrics.PixelRatio;
      return {
        x: x.x / pr,
        y: x.y / pr,
        w: x.w / pr,
        h: x.h / pr,
        open: scene.SoundcloudPanel.Open,
      };
    });
    const clip = { x: result.x - 10, y: result.y, width: result.w + 20, height: result.h };
    await page.mouse.move(result.x - 200, result.y - 100);
    await page.waitForTimeout(300);
    const idle = await page.screenshot({ clip });
    await page.mouse.move(result.x + result.w / 2, result.y + 20);
    await page.waitForTimeout(300);
    const hover = await page.screenshot({ clip });
    await page.screenshot({ path: `${OUT}/upload-file-button.png` });
    const texts = await page.evaluate(() =>
      (window.__texts ?? []).filter((text) => text.includes('FILE')).slice(0, 3),
    );
    await page.close();
    const ok =
      result.open &&
      texts.includes('UPLOAD FILE') &&
      !texts.includes('YOUR FILE') &&
      !idle.equals(hover);
    return [ok, { open: result.open, texts, hoverChangesIt: !idle.equals(hover) }];
  },
  /** SAVE uses the browser's save dialog where there is one, starting in Music (a page can't open
   * a sub-folder it wasn't given) and remembering the patches folder (`id`). */
  async 'save-picker'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await page.evaluate(() => {
      const written: string[] = (window.__written = []);
      window.showSaveFilePicker = (savePickerOptions) => {
        window.__opts = savePickerOptions;
        return Promise.resolve({
          createWritable: () =>
            Promise.resolve({
              write: (text: string) => Promise.resolve(written.push(text)),
              close: () => Promise.resolve(),
            }),
        });
      };
    });
    await openPatches(page);
    await page.evaluate(() => {
      window.__bd_probe.scene.PatchesPanel.setTitle('Bass + Bells');
    });
    await patchesClick(page, 'save', 600);
    const result = await page.evaluate(() => ({
      opts: window.__opts,
      file: JSON.parse((window.__written ?? [])[0] ?? '{}') as {
        meta?: { title?: string };
        blocks?: unknown[];
      },
      saved: window.__bd_probe.scene.PatchesPanel.flashing('save'),
    }));
    // Cancelling the dialog saves nothing and says nothing.
    await page.evaluate(() => {
      window.showSaveFilePicker = () => Promise.reject(new DOMException('cancelled', 'AbortError'));
    });
    await page.waitForTimeout(1800);
    await patchesClick(page, 'save', 400);
    const cancelled = await page.evaluate(() =>
      window.__bd_probe.scene.PatchesPanel.flashing('save'),
    );
    await page.close();
    const ok =
      result.opts?.startIn === 'music' &&
      result.opts.id === 'blokdust-patches' &&
      result.opts.suggestedName === 'Bass + Bells.blokdust' &&
      result.file.meta?.title === 'Bass + Bells' &&
      result.file.blocks?.length === 1 &&
      result.saved &&
      !cancelled;
    return [
      ok,
      { opts: result.opts, title: result.file.meta?.title, saved: result.saved, cancelled },
    ];
  },
  /** DOWNLOAD PATCH is a quiet bordered button at the bottom right, and phones don't offer it. */
  async 'download-quiet'(errors: string[]) {
    const at = async (phone: boolean) => {
      const context = await browser.newContext({
        viewport: phone ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        isMobile: phone,
        hasTouch: phone,
      });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
      await page.waitForFunction(() => window.__bd_probe);
      await page.click('#start');
      await page.waitForTimeout(1500);
      await page.evaluate(() => {
        window.__bd_probe.scene.PatchesPanel.OpenPanel(0);
      });
      await page.waitForTimeout(1200);
      const result = await page.evaluate(() => {
        const pp = window.__bd_probe.scene.PatchesPanel;
        return {
          main: pp.centreOf('share'),
          download: pp.centreOf('save'),
          saveAs: pp.centreOf('saveAs'),
        };
      });
      if (!phone) await page.screenshot({ path: `${OUT}/save-tab-option-a.png` });
      await context.close();
      return result;
    };
    const desk = await at(false),
      phone = await at(true);
    const ok =
      !!desk.download &&
      !!desk.main &&
      desk.download[1] > desk.main[1] + 50 &&
      desk.download[0] > desk.main[0] &&
      !phone.download &&
      !!phone.saveAs;
    return [ok, { desk, phone }];
  },
};
