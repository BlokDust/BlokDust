// The Touchpad's pads, by mouse and by two fingers (CHG-0019), run by tests/e2e/new-blocks.ts.
import { encodePatch } from '../../../web/src/patch/share.ts';
import {
  OUT,
  blk,
  browser,
  menuItems,
  open,
  openPanel,
  rows,
  state,
  url,
  type Tests,
  savedParams,
  setParam,
} from './harness.ts';
import type { OptionRow, OptionsBlock } from '../pageGlobals.shared.ts';

export const touchpadTests: Tests = {
  // CHG-0019 (UI-0010): the Touchpad's pads are in its panel, in key; a pad plays, a slide is
  // legato, Key and Scale change the notes, and the panel fits between header and bottom controls.
  async touchpad(errors) {
    const page = await open(
      browser,
      [blk('t', 'source.tone', 0, 0), blk('g', 'input.touchpad', 0, -3)],
      errors,
    );
    const menu = await menuItems(page, 'Interaction');
    await openPanel(page, 'g');
    const info = () =>
      page.evaluate(() => {
        const optionsPanel = window.__bd_probe.scene.OptionsPanel,
          padsRow = (optionsPanel.Options as OptionRow[]).find((row) => row.Type === 'pads');
        if (!padsRow) throw new Error('the Touchpad has no pads row');
        return {
          x: optionsPanel.Position.x,
          y: optionsPanel.Position.y,
          top: optionsPanel.Position.y - optionsPanel.Size.height / 2,
          bottom: optionsPanel.Position.y + optionsPanel.Size.height / 2,
          shown: padsRow.Shown,
          pads: (padsRow.Pads ?? []).map((pad) => ({
            cx: optionsPanel.Position.x + pad.x + pad.w / 2,
            cy: optionsPanel.Position.y + pad.y + pad.h / 2,
            note: pad.note,
            h: pad.h,
          })),
        };
      });
    const panel = await info();
    await page.screenshot({ path: `${OUT}/touchpad.png` });
    const names = (await rows(page)).map((row) => row.name);
    // The bottom row, left to right, in C major: C D E F G A B C.
    const bottom = panel.pads.slice(0, 8).map((pad) => pad.note),
      second = panel.pads.slice(8, 16).map((pad) => pad.note);
    const gateOnsBefore = (await state(page)).gateOns;
    const padE3 = panel.pads[2],
      padF3 = panel.pads[3];
    await page.mouse.move(padE3.cx, padE3.cy);
    await page.mouse.down();
    await page.waitForTimeout(300);
    const struck = (await state(page)).gateOns - gateOnsBefore,
      loud = (await state(page)).rms > 0.005,
      held = await page.evaluate(() => window.__bd_pads());
    await page.mouse.move(padF3.cx, padF3.cy, { steps: 4 });
    await page.waitForTimeout(300);
    const slid = await page.evaluate(() => window.__bd_pads()),
      afterSlide = (await state(page)).gateOns - gateOnsBefore,
      stillLoud = (await state(page)).rms > 0.005;
    await page.mouse.up();
    await page.waitForTimeout(400);
    const quiet = (await state(page)).rms < 0.001,
      released = await page.evaluate(() => window.__bd_pads());
    // Key D, scale minor: the bottom row starts on D and follows D minor.
    await page.evaluate(() => {
      const touchpad = window.__bd_probe.scene.OptionsPanel.SelectedBlock as OptionsBlock;
      touchpad.SetParam('key', 2);
      touchpad.SetParam('scale', 1);
      touchpad.RefreshOptionsPanel();
    });
    await page.waitForTimeout(300);
    const dminor = (await info()).pads.slice(0, 8).map((pad) => pad.note);
    await setParam(page, 'inKey', false);
    await page.waitForTimeout(300);
    const chromatic = (await info()).pads.slice(0, 8).map((pad) => pad.note);
    const saved = await savedParams(page, 'g');
    await page.close();
    const pass =
      menu.includes('Touchpad') &&
      panel.shown?.cols === 8 &&
      panel.shown.rows === 4 &&
      panel.top > 90 + 20 &&
      panel.bottom < 800 - 100 &&
      panel.pads[0].h > 45 &&
      bottom.join() === '48,50,52,53,55,57,59,60' &&
      second.join() === '53,55,57,59,60,62,64,65' &&
      struck === 1 &&
      loud &&
      held.join() === '52' &&
      slid.join() === '53' &&
      afterSlide === 1 &&
      stillLoud &&
      quiet &&
      released.length === 0 &&
      dminor.join() === '50,52,53,55,57,58,60,62' &&
      chromatic.join() === '50,51,52,53,54,55,56,57' &&
      saved.key === 2 &&
      saved.scale === 1 &&
      saved.chromatic === 1;
    return [
      pass,
      {
        menu,
        names,
        shown: panel.shown,
        top: panel.top,
        bottom: panel.bottom,
        padH: panel.pads[0].h,
        bottomRow: bottom,
        second,
        struck,
        loud,
        held,
        slid,
        afterSlide,
        stillLoud,
        quiet,
        released,
        dminor,
        chromatic,
        saved,
      },
    ];
  },
  // CHG-0019: two fingers on two pads sound two voices (multi-touch), on a phone-sized screen
  // with its 6 × 5 pads.
  async 'touchpad-touch'(errors) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    const token = await encodePatch({
      format: 'blokdust.patch',
      version: 2,
      seed: 1,
      blocks: [blk('t', 'source.tone', 0, 0), blk('g', 'input.touchpad', 0, -3)],
    });
    await page.goto(`${url}/index.html?c=${token}`);
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForFunction(() => window.__bd_probe.state.snapshots > 10);
    await page.waitForTimeout(1200);
    await openPanel(page, 'g');
    const phone = await page.evaluate(() => {
      const optionsPanel = window.__bd_probe.scene.OptionsPanel,
        padsRow = (optionsPanel.Options as OptionRow[]).find((row) => row.Type === 'pads'),
        dpr = devicePixelRatio;
      if (!padsRow) throw new Error('the Touchpad has no pads row');
      return {
        top: (optionsPanel.Position.y - optionsPanel.Size.height / 2) / dpr,
        bottom: (optionsPanel.Position.y + optionsPanel.Size.height / 2) / dpr,
        shown: padsRow.Shown,
        pads: (padsRow.Pads ?? []).map((pad) => ({
          cx: (optionsPanel.Position.x + pad.x + pad.w / 2) / dpr,
          cy: (optionsPanel.Position.y + pad.y + pad.h / 2) / dpr,
          note: pad.note,
          w: pad.w / dpr,
          h: pad.h / dpr,
        })),
      };
    });
    await page.screenshot({ path: `${OUT}/touchpad-phone.png` });
    const cdp = await context.newCDPSession(page);
    const gateOnsBefore = (await state(page)).gateOns;
    const padAt = (index: number) => phone.pads[index];
    const pt = (index: number, id: number) => ({ x: padAt(index).cx, y: padAt(index).cy, id });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(0, 1)] });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [pt(0, 1), pt(4, 2)],
    });
    await page.waitForTimeout(400);
    const two = await page.evaluate(() => window.__bd_pads()),
      struck = (await state(page)).gateOns - gateOnsBefore;
    // A third finger in the gap between two pads plays the nearer one, and nothing zooms.
    const gap = { x: (padAt(1).cx + padAt(2).cx) / 2, y: padAt(1).cy, id: 3 };
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [pt(0, 1), pt(4, 2), gap],
    });
    await page.waitForTimeout(300);
    const three = await page.evaluate(() => window.__bd_pads()),
      pinch = await page.evaluate(() => window.__bd_touch().pinch);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [pt(0, 1), pt(4, 2)],
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [pt(4, 2)] });
    await page.waitForTimeout(200);
    const one = await page.evaluate(() => window.__bd_pads());
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(300);
    const none = await page.evaluate(() => window.__bd_pads());
    await context.close();
    const pass =
      phone.shown?.cols === 6 &&
      phone.shown.rows === 5 &&
      padAt(0).w > 44 &&
      padAt(0).h > 40 &&
      phone.bottom < 844 - 60 &&
      phone.top > 100 &&
      two.length === 2 &&
      struck === 2 &&
      three.length === 3 &&
      !pinch &&
      one.length === 1 &&
      none.length === 0;
    return [
      pass,
      {
        shown: phone.shown,
        top: phone.top,
        bottom: phone.bottom,
        pad: [padAt(0).w, padAt(0).h],
        two,
        struck,
        three,
        pinch,
        one,
        none,
      },
    ];
  },
};
