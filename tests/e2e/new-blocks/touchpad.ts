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
} from './harness.ts';

export const touchpadTests: Tests = {
  // CHG-0019 (UI-0010): the Touchpad's pads are in its panel, in key; a pad plays, a slide is legato, Key and Scale change
  // the notes, and the panel fits between the header and the bottom controls.
  async touchpad(errors) {
    const p = await open(
      browser,
      [blk('t', 'source.tone', 0, 0), blk('g', 'input.touchpad', 0, -3)],
      errors,
    );
    const menu = await menuItems(p, 'Interaction');
    await openPanel(p, 'g');
    const info = () =>
      p.evaluate(() => {
        const optionsPanel = (window as any).__bd_probe.scene.OptionsPanel,
          pads = (optionsPanel.Options as any[]).find((x) => x.Type === 'pads');
        return {
          x: optionsPanel.Position.x,
          y: optionsPanel.Position.y,
          top: optionsPanel.Position.y - optionsPanel.Size.height / 2,
          bottom: optionsPanel.Position.y + optionsPanel.Size.height / 2,
          shown: pads.Shown,
          pads: (pads.Pads as any[]).map((q) => ({
            cx: optionsPanel.Position.x + q.x + q.w / 2,
            cy: optionsPanel.Position.y + q.y + q.h / 2,
            note: q.note,
            h: q.h,
          })),
        };
      });
    const a = await info();
    await p.screenshot({ path: `${OUT}/touchpad.png` });
    const names = (await rows(p)).map((x) => x.name ?? x.type);
    // bottom row, left to right, in C major: C D E F G A B C
    const bottom = a.pads.slice(0, 8).map((q) => q.note),
      second = a.pads.slice(8, 16).map((q) => q.note);
    const g0 = (await state(p)).gateOns;
    const e = a.pads[2],
      f = a.pads[3]; // E3, F3
    await p.mouse.move(e.cx, e.cy);
    await p.mouse.down();
    await p.waitForTimeout(300);
    const struck = (await state(p)).gateOns - g0,
      loud = (await state(p)).rms > 0.005,
      held = await p.evaluate(() => (window as any).__bd_pads());
    await p.mouse.move(f.cx, f.cy, { steps: 4 });
    await p.waitForTimeout(300);
    const slid = await p.evaluate(() => (window as any).__bd_pads()),
      afterSlide = (await state(p)).gateOns - g0,
      stillLoud = (await state(p)).rms > 0.005;
    await p.mouse.up();
    await p.waitForTimeout(400);
    const quiet = (await state(p)).rms < 0.001,
      released = await p.evaluate(() => (window as any).__bd_pads());
    // Key D, scale minor: the bottom row starts on D and follows D minor.
    await p.evaluate(() => {
      const b = (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock;
      b.SetParam('key', 2);
      b.SetParam('scale', 1);
      b.RefreshOptionsPanel();
    });
    await p.waitForTimeout(300);
    const dminor = (await info()).pads.slice(0, 8).map((q) => q.note);
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('inKey', false),
    );
    await p.waitForTimeout(300);
    const chromatic = (await info()).pads.slice(0, 8).map((q) => q.note);
    const saved = (await state(p)).patch.blocks.find((b: any) => b.id === 'g').params;
    await p.close();
    const pass =
      menu.includes('Touchpad') &&
      a.shown.cols === 8 &&
      a.shown.rows === 4 &&
      a.top > 90 + 20 &&
      a.bottom < 800 - 100 &&
      a.pads[0].h > 45 &&
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
        shown: a.shown,
        top: a.top,
        bottom: a.bottom,
        padH: a.pads[0].h,
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
  // CHG-0019: two fingers on two pads sound two voices (multi-touch), on a phone-sized screen with its 6 × 5 pads.
  async 'touchpad-touch'(errors) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      hasTouch: true,
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    const token = await encodePatch({
      format: 'blokdust.patch',
      version: 2,
      seed: 1,
      blocks: [blk('t', 'source.tone', 0, 0), blk('g', 'input.touchpad', 0, -3)],
    });
    await p.goto(`${url}/index.html?c=${token}`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
    await p.waitForTimeout(1200);
    await openPanel(p, 'g');
    const a = await p.evaluate(() => {
      const optionsPanel = (window as any).__bd_probe.scene.OptionsPanel,
        pads = (optionsPanel.Options as any[]).find((x) => x.Type === 'pads'),
        d = devicePixelRatio;
      return {
        top: (optionsPanel.Position.y - optionsPanel.Size.height / 2) / d,
        bottom: (optionsPanel.Position.y + optionsPanel.Size.height / 2) / d,
        shown: pads.Shown,
        pads: (pads.Pads as any[]).map((q) => ({
          cx: (optionsPanel.Position.x + q.x + q.w / 2) / d,
          cy: (optionsPanel.Position.y + q.y + q.h / 2) / d,
          note: q.note,
          w: q.w / d,
          h: q.h / d,
        })),
      };
    });
    await p.screenshot({ path: `${OUT}/touchpad-phone.png` });
    const cdp = await ctx.newCDPSession(p);
    const g0 = (await state(p)).gateOns;
    const pt = (i: number, id: number) => ({ x: a.pads[i].cx, y: a.pads[i].cy, id });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(0, 1)] });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [pt(0, 1), pt(4, 2)],
    });
    await p.waitForTimeout(400);
    const two = await p.evaluate(() => (window as any).__bd_pads()),
      struck = (await state(p)).gateOns - g0;
    // A third finger in the gap between two pads plays the nearer one (owner, 2026-11-14), and nothing zooms.
    const gap = { x: (a.pads[1].cx + a.pads[2].cx) / 2, y: a.pads[1].cy, id: 3 };
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [pt(0, 1), pt(4, 2), gap],
    });
    await p.waitForTimeout(300);
    const three = await p.evaluate(() => (window as any).__bd_pads()),
      pinch = await p.evaluate(() => (window as any).__bd_touch().pinch);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [pt(0, 1), pt(4, 2)],
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [pt(4, 2)] });
    await p.waitForTimeout(200);
    const one = await p.evaluate(() => (window as any).__bd_pads());
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(300);
    const none = await p.evaluate(() => (window as any).__bd_pads());
    await ctx.close();
    const pass =
      a.shown.cols === 6 &&
      a.shown.rows === 5 &&
      a.pads[0].w > 44 &&
      a.pads[0].h > 40 &&
      a.bottom < 844 - 60 &&
      a.top > 100 &&
      two.length === 2 &&
      struck === 2 &&
      three.length === 3 &&
      !pinch &&
      one.length === 1 &&
      none.length === 0;
    return [
      pass,
      {
        shown: a.shown,
        top: a.top,
        bottom: a.bottom,
        pad: [a.pads[0].w, a.pads[0].h],
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
