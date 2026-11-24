// Black-box tests for the post-2.0 blocks (SCOPE-0005, CHG-0014 … CHG-0021): the real app, pointer and AudioWorklet.
//   pnpm test:new-blocks [--only name,name]
// Each test opens a v2 patch from a `?c=p…` link, so it also proves the blocks load from a shared patch.
import { writeFileSync } from 'node:fs';
import type { Page } from 'playwright';
import { encodePatch } from '../../web/src/patch/share.ts';
import {
  OUT,
  blk,
  browser,
  idOf,
  menuItems,
  open,
  openPanel,
  rowPoint,
  rows,
  server,
  state,
  url,
  type Tests,
} from './new-blocks/harness.ts';
import { stageTests } from './new-blocks/stage.ts';
import { stagePlayTests } from './new-blocks/stage-play.ts';
import { labelsTests } from './new-blocks/labels.ts';

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const results: Record<string, unknown> = {};
let ok = true;

const tests: Tests = {
  // CHG-0014: the Compressor is in the Effect menu; its panel shows the meter (level, threshold, gain reduction).
  async 'compressor-panel'(errors) {
    const p = await open(
      browser,
      [
        blk('t', 'source.tone', 0, 0),
        blk('pw', 'power.power', -3, 0),
        blk('c', 'fx.compressor', 3, 0, { threshold: -40, ratio: 12 }),
      ],
      errors,
    );
    const inMenu = (await menuItems(p, 'Effect')).includes('Compressor');
    await openPanel(p, 'c');
    await p.waitForTimeout(600);
    const r = await rows(p);
    await p.screenshot({ path: `${OUT}/compressor-panel.png` });
    const meter = r.find((x) => x.setting === 'compMeter')?.shown as
      { level: number; reduction: number; thresholdX: number; width: number } | undefined;
    const names = r.map((x) => x.name);
    const sounding = (await state(p)).rms > 0.001;
    // The Level meter's line is the Threshold (owner, 2026-11-14): drag it to the middle → −30 dB.
    const from = await rowPoint(p, 'compMeter', 20 / 60),
      to = await rowPoint(p, 'compMeter', 0.5);
    await p.mouse.move(...from);
    await p.mouse.down();
    await p.mouse.move(...to, { steps: 6 });
    await p.mouse.up();
    await p.waitForTimeout(300);
    const dragged = (await state(p)).patch.blocks.find((b: any) => b.id === 'c').params.threshold;
    await p.close();
    const pass =
      inMenu &&
      sounding &&
      !!meter &&
      meter.level > -40 &&
      meter.level < 0 &&
      meter.reduction < -1 &&
      Math.abs(meter.thresholdX - meter.width * (20 / 60)) < 1 &&
      ['Level', 'Ratio', 'Knee', 'Attack', 'Release', 'Makeup'].every((n) => names.includes(n)) &&
      !names.includes('Threshold') &&
      Math.abs(dragged + 30) < 1;
    return [pass, { inMenu, sounding, meter, names, dragged }];
  },
  // CHG-0014: the emitter's Offset row, after Swing when synced and after Fire Rate when not.
  async 'emitter-offset-row'(errors) {
    const p = await open(
      browser,
      [blk('e', 'power.emitter', 0, 0, { sync: true, offset: 0.25 })],
      errors,
    );
    await openPanel(p, 'e');
    const synced = (await rows(p)).map((x) => x.name);
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('sync', false),
    );
    await p.waitForTimeout(300);
    const free = (await rows(p)).map((x) => x.name);
    const saved = (await state(p)).patch.blocks[0].params.offset;
    await p.close();
    const pass =
      synced.indexOf('Offset') === synced.indexOf('Swing') + 1 &&
      free.indexOf('Offset') === free.indexOf('Fire Rate') + 1 &&
      saved === 0.25;
    return [pass, { synced, free, saved }];
  },
  // Owner review 2026-11-14: the Power block's panel (Hits Cut Power: owner, 2026-11-20); a Laser's Rotate sticks at 0; an emitter's
  // panel draws the way it fires.
  async 'power-gap-rotate-guide'(errors) {
    const p = await open(
      browser,
      [
        blk('pw', 'power.power', -8, 0),
        blk('l', 'power.laser', 0, 0, { rotate: 200 }),
        blk('e', 'power.emitter', 8, 0, { angle: 0 }),
      ],
      errors,
    );
    await openPanel(p, 'pw');
    const off = (await rows(p)).map((x) => (x.type === 'switches' ? 'switches' : x.name));
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('cutByHits', true),
    );
    await p.waitForTimeout(300);
    const on = (await rows(p)).map((x) => (x.type === 'switches' ? 'switches' : x.name));
    const gapSaved = (await state(p)).patch.blocks.find((b: any) => b.id === 'pw').params;
    await p.mouse.click(1100, 700);
    await p.waitForTimeout(500);
    await openPanel(p, 'l');
    const near = await rowPoint(p, 'rotate', 0.53);
    await p.mouse.move(...near);
    await p.mouse.down();
    await p.waitForTimeout(100);
    const snapped = (await state(p)).patch.blocks.find((b: any) => b.id === 'l').params.rotate ?? 0;
    await p.waitForTimeout(700);
    await p.mouse.move(near[0] + 2, near[1]);
    await p.mouse.move(near[0], near[1]);
    await p.mouse.up();
    const fine = (await state(p)).patch.blocks.find((b: any) => b.id === 'l').params.rotate ?? 0;
    await p.mouse.click(1100, 700);
    await p.waitForTimeout(500);
    await openPanel(p, 'e');
    const guide = await p.evaluate(
      () => (window as any).__bd_probe.scene.OptionsPanel.PrismExits as [number, number][],
    );
    await p.screenshot({ path: `${OUT}/emitter-guide.png` });
    await p.close();
    const pass =
      off.join() === 'switches' &&
      on.join() === 'switches' &&
      gapSaved.cutByHits === 1 &&
      snapped === 0 &&
      fine > 0 &&
      fine < 50 &&
      guide?.length === 1 &&
      guide[0][0] > 0 &&
      Math.abs(guide[0][1]) < 1;
    return [pass, { off, on, gapSaved, snapped, fine, guide }];
  },
  // CHG-0029 (R2b, SIMULATION-0010): the Pulse's Delay row (seconds; musical steps when synced) is saved and reaches
  // the engine: the same patch sounds `delay` later.
  async 'pulse-delay'(errors) {
    const scene = (delay: number) => [
      blk('e', 'power.emitter', -10, 0, { angle: 0, selfPoweredMode: true, speed: 6, rate: 200 }),
      blk('pu', 'power.pulse', 0, 0, { delay, pulseLength: 0.3 }),
      blk('t', 'source.tone', 0, 5),
    ];
    /** Seconds from START until it first sounds. */
    const onset = async (p: Page) => {
      const t0 = Date.now();
      while (Date.now() - t0 < 6000) {
        if ((await state(p)).rms > 0.002) return (Date.now() - t0) / 1000;
        await p.waitForTimeout(20);
      }
      return -1;
    };
    const p0 = await open(browser, scene(0), errors);
    const at0 = await onset(p0);
    await p0.close();
    const p = await open(browser, scene(1), errors);
    const at1 = await onset(p);
    await openPanel(p, 'pu');
    const free = (await rows(p)).map((x) => (x.type === 'switches' ? 'switches' : x.name));
    const drag = await rowPoint(p, 'delay', 0.5); // half of 0–4 s
    await p.mouse.move(drag[0] - 30, drag[1]);
    await p.mouse.down();
    await p.mouse.move(drag[0], drag[1], { steps: 4 });
    await p.mouse.up();
    await p.waitForTimeout(300);
    const dragged = (await state(p)).patch.blocks.find((b: any) => b.id === 'pu').params.delay;
    await p.screenshot({ path: `${OUT}/pulse-delay.png` });
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('sync', true),
    );
    await p.waitForTimeout(300);
    const synced = (await rows(p)).map((x) => (x.type === 'switches' ? 'switches' : x.name));
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('pulseDelayIndex', 6),
    ); // 1/8
    await p.waitForTimeout(300);
    const saved = (await state(p)).patch.blocks.find((b: any) => b.id === 'pu').params;
    await p.close();
    const late = at1 - at0;
    const pass =
      at0 > 0 &&
      at1 > 0 &&
      Math.abs(late - 1) < 0.3 &&
      free.join() === 'switches,Pulse length,Delay,switches' &&
      synced.join() === 'switches,Length,Delay,switches' &&
      Math.abs(dragged - 2) < 0.3 &&
      saved.delayBeats === 0.5 &&
      (saved.sync === 1 || saved.sync === true);
    return [
      pass,
      {
        at0,
        at1,
        late,
        free,
        synced,
        dragged,
        saved: { delay: saved.delay, delayBeats: saved.delayBeats, sync: saved.sync },
      },
    ];
  },
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
        const o = (window as any).__bd_probe.scene.OptionsPanel,
          pads = (o.Options as any[]).find((x) => x.Type === 'pads');
        return {
          x: o.Position.x,
          y: o.Position.y,
          top: o.Position.y - o.Size.height / 2,
          bottom: o.Position.y + o.Size.height / 2,
          shown: pads.Shown,
          pads: (pads.Pads as any[]).map((q) => ({
            cx: o.Position.x + q.x + q.w / 2,
            cy: o.Position.y + q.y + q.h / 2,
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
      const o = (window as any).__bd_probe.scene.OptionsPanel,
        pads = (o.Options as any[]).find((x) => x.Type === 'pads'),
        d = devicePixelRatio;
      return {
        top: (o.Position.y - o.Size.height / 2) / d,
        bottom: (o.Position.y + o.Size.height / 2) / d,
        shown: pads.Shown,
        pads: (pads.Pads as any[]).map((q) => ({
          cx: (o.Position.x + q.x + q.w / 2) / d,
          cy: (o.Position.y + q.y + q.h / 2) / d,
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
  // CHG-0018: an LFO beside a Volume aims at its Level; the Volume's open slider follows; the patch keeps the target by
  // block id and the Level where it was set. The carousel lists "Block · Param" for what is connected.
  async lfo(errors) {
    const p = await open(
      browser,
      [
        blk('t', 'source.tone', 0, 0),
        blk('pw', 'power.power', -3, 0),
        blk('v', 'fx.volume', 3, 0, { gain: 0 }),
        blk('l', 'fx.lfo', 7, 0, { target: 'v:gain', rate: 2, depth: 1, targetBlock: 99 }),
      ],
      errors,
    );
    const menu = await menuItems(p, 'Effect');
    // Heard: the level swings, so the loudness differs between moments.
    const levels: number[] = [];
    for (let i = 0; i < 12; i++) {
      await p.waitForTimeout(90);
      levels.push((await state(p)).rms);
    }
    await openPanel(p, 'v');
    const seen: number[] = [];
    for (let i = 0; i < 8; i++) {
      await p.waitForTimeout(80);
      seen.push(
        await p.evaluate(
          () =>
            ((window as any).__bd_probe.scene.OptionsPanel.Options as any[]).find(
              (o) => o.Setting === 'gain',
            ).Followed as number,
        ),
      );
    }
    await p.screenshot({ path: `${OUT}/lfo-follow.png` });
    await p.mouse.click(200, 650);
    await p.waitForTimeout(500);
    const q = await open(
      browser,
      [
        blk('t', 'source.tone', 0, 0),
        blk('v', 'fx.volume', 3, 0),
        blk('l', 'fx.lfo', 0, 3, { target: 'v:gain' }),
      ],
      errors,
    );
    await openPanel(q, 'l');
    const target = () =>
      q.evaluate(() => {
        const o = ((window as any).__bd_probe.scene.OptionsPanel.Options as any[]).find(
          (x) => x.Setting === 'lfoTarget',
        );
        return String(o.DisplayConversion(o.Value));
      });
    const first = await target();
    const list = await q.evaluate(() =>
      ((window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.LfoTargets as any[]).map(
        (t) => t.label,
      ),
    );
    await q.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('lfoTarget', 1),
    ); // the first entry: the Tone's Note
    await q.waitForTimeout(300);
    const second = await target();
    const names = (await rows(q)).map((x) => x.name);
    await q.screenshot({ path: `${OUT}/lfo-panel.png` });
    const saved = (await state(q)).patch.blocks.find((b: any) => b.id === 'l').params;
    const savedGain = (await state(p)).patch.blocks.find((b: any) => b.id === 'v').params.gain;
    await p.close();
    await q.close();
    const swing = Math.max(...levels) / Math.max(1e-6, Math.min(...levels));
    const pass =
      menu.includes('LFO') &&
      swing > 2 &&
      Math.max(...seen) - Math.min(...seen) > 5 &&
      savedGain === 0 &&
      first === 'VOLUME · LEVEL' &&
      list.join() === 'TONE · NOTE,TONE · FINE,VOLUME · LEVEL' &&
      second === 'TONE · NOTE' &&
      saved.target === 't:transpose' &&
      ['Target', 'Shape', 'Rate', 'Depth', 'Phase'].every((n) => names.includes(n));
    return [pass, { swing, seen, savedGain, first, list, second, saved, names }];
  },
  // CHG-0017: Silent Keys is a switch on the keyboards, off by default; on, held keys are silent and a press
  // (power) on the Tone plays them.
  async 'keys-set-pitch'(errors) {
    const p = await open(
      browser,
      [blk('t', 'source.tone', 0, 0), blk('k', 'input.computer-keyboard', 0, -3)],
      errors,
    );
    await openPanel(p, 'k');
    const sw = await p.evaluate(() =>
      ((window as any).__bd_probe.scene.OptionsPanel.Options as any[])
        .find((o) => o.Type === 'switches')
        .Switches.map((s: any) => ({ name: s.Name, on: !!s.Selected })),
    );
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('keysSetPitch', true),
    );
    await p.mouse.click(200, 650); // close the panel
    await p.waitForTimeout(500);
    const before = (await state(p)).gateOns;
    await p.keyboard.down('KeyZ');
    await p.keyboard.down('KeyC');
    await p.keyboard.down('KeyB'); // C E G
    await p.waitForTimeout(400);
    const held = (await state(p)).gateOns - before,
      quiet = (await state(p)).rms < 0.0005;
    const at = (await p.evaluate(
      (i) => (window as any).__bd_probe.blockPoint(i),
      await idOf(p, 't'),
    )) as [number, number];
    await p.mouse.move(at[0], at[1]);
    await p.mouse.down();
    await p.waitForTimeout(400);
    const struck = (await state(p)).gateOns - before,
      loud = (await state(p)).rms > 0.005;
    await p.mouse.up();
    for (const k of ['KeyZ', 'KeyC', 'KeyB']) await p.keyboard.up(k);
    const saved = (await state(p)).patch.blocks.find((b: any) => b.id === 'k').params.keysSetPitch;
    await p.close();
    const pass =
      sw.some((s: any) => s.name === 'Silent Keys' && !s.on) &&
      held === 0 &&
      quiet &&
      struck === 3 &&
      loud &&
      !!saved;
    return [pass, { sw, held, quiet, struck, loud, saved }];
  },
  // CHG-0017: Chord, Arpeggiator and Random Note are in the Effect menu; a Chord by a powered Tone sounds three voices;
  // the Arpeggiator's panel has Speed, and Per Hit hides it.
  async 'note-effects'(errors) {
    const p = await open(
      browser,
      [
        blk('t', 'source.tone', 0, 0),
        blk('pw', 'power.power', -3, 0),
        blk('ch', 'fx.chord', 3, 0),
        blk('t2', 'source.tone', -14, -8),
        blk('pw2', 'power.power', -17, -8),
        blk('arp', 'fx.arpeggiator', -11, -8, { sync: false, speed: 10 }),
        blk('ch2', 'fx.chord', -11, -5),
      ],
      errors,
    );
    const menu = await menuItems(p, 'Effect');
    const s0 = await state(p);
    await p.waitForTimeout(1000);
    const s1 = await state(p);
    await openPanel(p, 'arp');
    const timed = (await rows(p)).map((x) => x.name);
    await p.screenshot({ path: `${OUT}/arpeggiator.png` });
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('perHit', true),
    );
    await p.waitForTimeout(300);
    const perHit = (await rows(p)).map((x) => x.name);
    await p.close();
    const q = await open(browser, [blk('rn', 'fx.random-note', 0, 0)], errors);
    await openPanel(q, 'rn');
    const random = (await rows(q)).map((x) => ({ name: x.name, type: x.type }));
    await q.screenshot({ path: `${OUT}/random-note.png` });
    await q.close();
    const steps = s1.gateOns - s0.gateOns; // the arpeggiated Tone strikes about 10 notes a second
    const pass =
      ['Chord', 'Arpeggiator', 'Random Note'].every((n) => menu.includes(n)) &&
      steps >= 8 &&
      steps <= 12 &&
      timed.includes('Speed') &&
      timed.includes('Pattern') &&
      timed.includes('Octaves') &&
      !perHit.includes('Speed') &&
      random.map((r) => r.name).join() === 'Notes,Key,Range'; // CHG-0040 (UI-0016)
    return [pass, { menu, steps, timed, perHit, random }];
  },
  // CHG-0040 (UI-0016, R10f, R10h): Random Note's and Chord's bars. A press on a bar sets it (to the patch and the
  // engine) and shows its value above the row; Key slides the bars; Range's handles move by semitone and never cross;
  // a played note lights its bar.
  async 'note-bars'(errors) {
    const p = await open(
      browser,
      [
        blk('e', 'power.emitter', -8, 0, { angle: 0, selfPoweredMode: true, rate: 30, speed: 12 }),
        blk('t', 'source.tone', 0, 0),
        blk('rn', 'fx.random-note', 3, 0, { w0: 0, w2: 0, w4: 0, w5: 0, w7: 1, w9: 0, w11: 0 }),
      ],
      errors,
    );
    await openPanel(p, 'rn');
    const bars = () =>
      p.evaluate(
        () =>
          ((window as any).__bd_probe.scene.OptionsPanel.Options as any[]).find(
            (o) => o.Setting === 'noteBars',
          ).Shown,
      );
    const barAt = (n: number, f: number) =>
      p.evaluate(
        ([n, f]) => {
          const P = (window as any).__bd_probe,
            o = P.scene.OptionsPanel,
            pr = P.v1App.Metrics.PixelRatio,
            s = (o.Options as any[]).find((x) => x.Setting === 'noteBars').Shown;
          return [
            (o.Position.x + s.cells[n]) / pr,
            (o.Position.y + s.bottom - (s.bottom - s.top) * f) / pr,
          ] as [number, number];
        },
        [n, f],
      );
    const saved = async (uid: string) =>
      (await state(p)).patch.blocks.find((b: any) => b.id === uid).params;
    await p
      .waitForFunction(
        () => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.__bdLit,
        null,
        { timeout: 5000 },
      )
      .catch(() => null);
    const lit = (await bars()).values,
      litNow = await p.evaluate(
        () => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.__bdLit?.note,
      ); // a hit played G
    // drag A (bar 9) to about half
    let [x, y] = await barAt(9, 0.5);
    await p.mouse.move(x, y);
    await p.mouse.down();
    await p.mouse.move(x + 30, y - 2, { steps: 4 }); // sideways stays on A
    const held = await bars();
    await p.screenshot({ path: `${OUT}/note-bars-drag.png` });
    await p.mouse.up();
    await p.waitForTimeout(200);
    const afterDrag = await saved('rn');
    // Key D: the pattern slides two bars right
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('key', 2),
    );
    await p.waitForTimeout(200);
    const shifted = (await bars()).values;
    // Range: the low handle dragged past the high one stops on it
    const range = () =>
      p.evaluate(
        () =>
          ((window as any).__bd_probe.scene.OptionsPanel.Options as any[]).find(
            (o) => o.Setting === 'noteRange',
          ).Shown,
      );
    const r0 = await range();
    const py = await p.evaluate(() => {
      const P = (window as any).__bd_probe,
        o = P.scene.OptionsPanel,
        r = (o.Options as any[]).find((x) => x.Setting === 'noteRange');
      return (o.Position.y + r.Position.y + r.Size.height / 2) / P.v1App.Metrics.PixelRatio;
    });
    const pr = await p.evaluate(() => (window as any).__bd_probe.v1App.Metrics.PixelRatio),
      ox = await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.Position.x);
    await p.mouse.move((ox + r0.lowX) / pr, py);
    await p.mouse.down();
    await p.mouse.move((ox + r0.highX) / pr + 80, py, { steps: 6 });
    const r1 = await range();
    await p.mouse.up();
    await p.waitForTimeout(200);
    const afterRange = await saved('rn');
    await p.close();
    // Chord: its bars are stepped and name their chord
    const c = await open(browser, [blk('ch', 'fx.chord', 0, 0)], errors);
    await openPanel(c, 'ch');
    const cb = () =>
      c.evaluate(
        () =>
          ((window as any).__bd_probe.scene.OptionsPanel.Options as any[]).find(
            (o) => o.Setting === 'noteBars',
          ).Shown,
      );
    const c0 = (await cb()).values;
    const [cx, cy] = await c.evaluate(() => {
      const P = (window as any).__bd_probe,
        o = P.scene.OptionsPanel,
        pr = P.v1App.Metrics.PixelRatio,
        s = (o.Options as any[]).find((x) => x.Setting === 'noteBars').Shown;
      return [
        (o.Position.x + s.cells[2]) / pr,
        (o.Position.y + s.bottom - (s.bottom - s.top) * (2 / 7) - 2) / pr,
      ];
    });
    await c.mouse.move(cx, cy);
    await c.mouse.down();
    await c.mouse.up();
    await c.waitForTimeout(200);
    const chordSaved = (await state(c)).patch.blocks.find((b: any) => b.id === 'ch').params;
    const names = (await rows(c)).map((r) => r.name ?? r.type);
    await c.close();
    const pass =
      lit[7] === 1 &&
      litNow === 7 &&
      held.held === 9 &&
      afterDrag.w9 > 0.4 &&
      afterDrag.w9 < 0.6 &&
      afterDrag.w10 === undefined &&
      shifted[11] === afterDrag.w9 &&
      shifted[9] === 1 &&
      r0.low === 60 &&
      r0.high === 71 &&
      r1.low === 71 &&
      r1.high === 71 &&
      afterRange.low === 71 &&
      (afterRange.high ?? 71) === 71 &&
      c0.join() === '3,7,5,3,2,7,7,6,7,5,3,2' &&
      chordSaved.q2 === 2 &&
      names.includes('Key') &&
      names.includes('Chords');
    return [
      pass,
      {
        lit,
        litNow,
        held: held.held,
        afterDrag,
        shifted,
        r0,
        r1,
        afterRange,
        c0,
        chordSaved,
        names,
      },
    ];
  },
  // CHG-0016: a Sound Laser hears the Tone beside it; its beam powers a second Tone; a higher threshold turns it off.
  async 'sound-laser'(errors) {
    const p = await open(
      browser,
      [
        blk('t', 'source.tone', 0, 0),
        blk('pw', 'power.power', -3, 0),
        blk('s', 'power.sound-laser', 3, 0, { angle: 0, hold: 0 }),
        blk('far', 'source.tone', 10, 0, { transpose: 7 }),
      ],
      errors,
    );
    await p.waitForTimeout(400);
    const onBeams = await p.evaluate(() => (window as any).__bd_probe.beams as number);
    const powered = (await state(p)).powered as number[];
    await openPanel(p, 's');
    await p.waitForTimeout(400);
    const r = await rows(p);
    const meter = r.find((x) => x.setting === 'soundMeter')?.shown as
      { level: number; on: boolean } | undefined;
    await p.screenshot({ path: `${OUT}/sound-laser.png` });
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('threshold', -3),
    );
    await p.waitForTimeout(500);
    const offBeams = await p.evaluate(() => (window as any).__bd_probe.beams as number);
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('whenQuieter', 1),
    );
    await p.waitForTimeout(500);
    const invertedBeams = await p.evaluate(() => (window as any).__bd_probe.beams as number);
    const saved = (await state(p)).patch.blocks.find((b: any) => b.id === 's').params;
    const menu = await menuItems(p, 'Power');
    await p.close();
    const names = r.map((x) => x.name);
    const pass =
      menu.includes('Sound Laser') &&
      onBeams === 1 &&
      powered.length >= 2 &&
      !!meter &&
      meter.on &&
      meter.level > -25 &&
      offBeams === 0 &&
      invertedBeams === 1 &&
      saved.invert === 1 &&
      saved.threshold === -3 &&
      ['Level', 'Band', 'Beam on', 'Hold', 'Angle', 'Range'].every((n) => names.includes(n)) &&
      !names.includes('Threshold') &&
      !names.includes('Rotate');
    return [pass, { onBeams, offBeams, invertedBeams, powered, meter, names, saved }];
  },
  // CHG-0015: Counter, Chance and Prism are in the Power menu; the Counter's panel shows its pattern and where it is,
  // and its Reset sends it back to step 1 (R2c). It powers the Tone beside it by proximity.
  async 'counter-panel'(errors) {
    const p = await open(
      browser,
      [
        blk('e', 'power.emitter', -8, 0, { angle: 0, selfPoweredMode: true, rate: 30, speed: 12 }),
        blk('c', 'power.counter', 0, 0, { steps: 8, hits: 3 }),
        blk('t', 'source.tone', 0, 4),
      ],
      errors,
    );
    const menu = await menuItems(p, 'Power');
    await openPanel(p, 'c');
    const first = (await rows(p)).find((x) => x.type === 'live')?.shown as
      { pattern: string; next: number } | undefined;
    await p.waitForTimeout(1200); // a couple more particles
    const later = (await rows(p)).find((x) => x.type === 'live')?.shown as
      { pattern: string; next: number } | undefined;
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('hits', 5),
    );
    await p.waitForTimeout(300);
    const five = (await rows(p)).find((x) => x.type === 'live')?.shown as
      { pattern: string; cells: number[] } | undefined;
    await p.screenshot({ path: `${OUT}/counter-panel.png` });
    const s = await state(p);
    // A click on a step toggles it (owner, 2026-11-14); moving Steps, Hits or Rotate gives the pattern back.
    const step2 = (await p.evaluate((x) => {
      const o = (window as any).__bd_probe.scene.OptionsPanel,
        pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio,
        r = (o.Options as any[]).find((q) => q.Setting === 'counterPattern');
      return [(o.Position.x + x) / pr, (o.Position.y + r.Position.y + r.Size.height / 2) / pr];
    }, five!.cells[1])) as [number, number];
    await p.mouse.click(...step2);
    await p.waitForTimeout(300);
    const toggled = (await rows(p)).find((x) => x.type === 'live')?.shown.pattern,
      mask = (await state(p)).patch.blocks.find((b: any) => b.id === 'c').params.pattern;
    const hitsAt = await rowPoint(p, 'hits', 5 / 16);
    await p.mouse.click(...hitsAt);
    await p.waitForTimeout(300);
    const back = (await rows(p)).find((x) => x.type === 'live')?.shown.pattern,
      cleared = (await state(p)).patch.blocks.find((b: any) => b.id === 'c').params.pattern;
    // Reset: wait until the next step is 2–5, so one more hit in the meantime cannot bring it back to 0 or 1 by itself.
    const nextStep = async () =>
      ((await rows(p)).find((x) => x.type === 'live')?.shown as { next: number } | undefined)
        ?.next ?? -1;
    let beforeReset = await nextStep();
    for (let i = 0; i < 60 && (beforeReset < 2 || beforeReset > 5); i++) {
      await p.waitForTimeout(100);
      beforeReset = await nextStep();
    }
    await p.mouse.click(...(await rowPoint(p, 'resetCounter', 0.5)));
    await p.waitForTimeout(150);
    const afterReset = await nextStep();
    await p.close();
    const pass =
      ['Counter', 'Chance', 'Prism', 'Gate'].every((n) => menu.includes(n)) &&
      first?.pattern === 'x..x..x.' &&
      !!later &&
      later.next !== first.next &&
      five?.pattern === 'x.x.xx.x' &&
      s.hits > 0 &&
      s.connections.length > 0 &&
      toggled === 'xxx.xx.x' &&
      mask === 0b10110111 &&
      back === 'x.x.xx.x' &&
      (cleared ?? -1) === -1 &&
      beforeReset >= 2 &&
      beforeReset <= 5 &&
      afterReset >= 0 &&
      afterReset <= 1;
    return [
      pass,
      {
        menu,
        first,
        later,
        five: five?.pattern,
        hits: s.hits,
        connections: s.connections,
        toggled,
        mask,
        back,
        cleared,
        beforeReset,
        afterReset,
      },
    ];
  },
  // CHG-0031 (SPEC-AUDIO-WAVETABLE R7): the Wavetable is in the Source menu and sounds; its panel draws the frame it
  // plays, which changes with Table and follows an LFO moving Position.
  async wavetable(errors) {
    const p = await open(
      browser,
      [
        blk('w', 'source.wavetable', 0, 0, { table: 0, position: 0.2 }),
        blk('pw', 'power.power', -3, 0),
        blk('l', 'fx.lfo', 3, 0, { target: 'w:position', rate: 2, depth: 1 }),
      ],
      errors,
    );
    const inMenu = (await menuItems(p, 'Source')).includes('Wavetable');
    const sounding = (await state(p)).rms > 0.001;
    await openPanel(p, 'w');
    await p.waitForTimeout(300);
    const r1 = await rows(p);
    const names = r1.map((x) => x.name);
    const pic1 = r1.find((x) => x.setting === 'wavePicture')?.shown as
      { table: string; position: number; drawn: boolean; first: number[] } | undefined;
    await p.screenshot({ path: `${OUT}/wavetable-panel.png` });
    await p.waitForTimeout(170); // the LFO moves Position: the picture follows
    const pic2 = (await rows(p)).find((x) => x.setting === 'wavePicture')?.shown as typeof pic1;
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('table', 6),
    );
    await p.waitForTimeout(300);
    const pic3 = (await rows(p)).find((x) => x.setting === 'wavePicture')?.shown as typeof pic1;
    const table = (await state(p)).patch.blocks.find((b: any) => b.id === 'w').params.table;
    await p.close();
    const phone = await open(
      browser,
      [blk('w', 'source.wavetable', 0, 0, { table: 2, position: 0.6 })],
      errors,
      {},
      { width: 390, height: 844 },
    );
    await openPanel(phone, 'w');
    await phone.screenshot({ path: `${OUT}/wavetable-panel-phone.png` });
    await phone.close();
    const pass =
      inMenu &&
      sounding &&
      ['Wave', 'Table', 'Position', 'Note', 'Fine'].every((n) => names.includes(n)) &&
      !!pic1?.drawn &&
      pic1.table === 'BELL' &&
      !!pic2 &&
      pic2.position !== pic1.position &&
      pic3?.table === 'SYNC' &&
      table === 6;
    return [
      pass,
      {
        inMenu,
        sounding,
        names,
        pic1: pic1 && { ...pic1, first: undefined },
        moved: pic2?.position,
        pic3: pic3?.table,
        table,
      },
    ];
  },
  // CHG-0015: a Prism splits a laser's beam into its streams, and its panel draws the exit lines on the stage.
  // CHG-0015 (SPEC-SIMULATION R2d): a Chance at 100% switches the Tone beside it on and holds it (one note); at 0% it
  // switches it off and it never sounds again.
  async 'chance-fires'(errors) {
    const p = await open(
      browser,
      [
        blk('e', 'power.emitter', -8, 0, { angle: 0, selfPoweredMode: true, rate: 30, speed: 12 }),
        blk('c', 'power.chance', 0, 0, { chance: 1 }),
        blk('t', 'source.tone', 0, 4),
      ],
      errors,
    );
    const inMenu = (await menuItems(p, 'Power')).includes('Chance');
    await p.waitForTimeout(1500);
    const s = await state(p),
      notes = s.gateOns;
    await openPanel(p, 'c');
    const names = (await rows(p)).map((x) => x.name);
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('chance', 0),
    );
    await p.waitForTimeout(300);
    const g0 = (await state(p)).gateOns;
    await p.waitForTimeout(1500);
    const never = (await state(p)).gateOns - g0;
    await p.close();
    const pass =
      inMenu && s.connections.length > 0 && notes === 1 && names.includes('Chance') && never === 0;
    return [pass, { inMenu, connections: s.connections, notes, names, never }];
  },
  // CHG-0032 (SPEC-SIMULATION R7c, SIMULATION-0011): the Gate is in the Power menu and stops a beam until a Power
  // beside it opens it; Invert swaps that.
  async gate(errors) {
    const p = await open(
      browser,
      [
        blk('l', 'power.laser', -8, 0, { angle: 0, selfPoweredMode: true }),
        blk('g', 'power.gate', 0, 0),
        blk('t', 'source.tone', 8, 0),
      ],
      errors,
    );
    const inMenu = (await menuItems(p, 'Power')).includes('Gate');
    await p.waitForTimeout(500);
    const closed = (await state(p)).rms;
    await p.screenshot({ path: `${OUT}/gate-closed.png` });
    await openPanel(p, 'g');
    const names = await p.evaluate(
      () =>
        (
          (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.OptionsForm
            .parameters as any[]
        ).flatMap((r) =>
          r.type === 'switches' ? r.switches.map((x: any) => x.name) : [r.name],
        ) as string[],
    );
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('invert', true),
    );
    await p.waitForTimeout(600);
    const inverted = (await state(p)).rms;
    const saved = (await state(p)).patch.blocks.find((b: any) => b.id === 'g').params.invert;
    await p.screenshot({ path: `${OUT}/gate.png` });
    await p.close();
    const pass =
      inMenu && closed < 0.0005 && inverted > 0.001 && names.includes('Invert') && saved === 1;
    return [pass, { inMenu, closed, inverted, names, saved }];
  },
  async 'prism-splits-beam'(errors) {
    const p = await open(
      browser,
      [
        blk('l', 'power.laser', -6, 0, { angle: 0, selfPoweredMode: true, range: 300 }),
        blk('pr', 'power.prism', 0, 0, { angle: -90, streams: 3, spread: 90 }),
        blk('t', 'source.tone', 0, -8),
      ],
      errors,
    );
    await p.waitForTimeout(400);
    const beams = await p.evaluate(() => (window as any).__bd_probe.beams as number);
    const sounding = (await state(p)).rms > 0.001; // the middle stream points at the Tone
    await openPanel(p, 'pr');
    await p.waitForTimeout(300);
    const exits = await p.evaluate(
      () => (window as any).__bd_probe.scene.OptionsPanel.PrismExits as [number, number][],
    );
    const names = (await rows(p)).map((x) => x.name);
    await p.screenshot({ path: `${OUT}/prism.png` });
    await p.close();
    const up = exits?.[1],
      pass =
        beams === 4 &&
        sounding &&
        exits?.length === 3 &&
        Math.abs(up[0]) < 0.5 &&
        up[1] < 0 &&
        ['Angle', 'Rotate', 'Streams', 'Spread'].every((n) => names.includes(n));
    return [pass, { beams, sounding, exits, names }];
  },
  ...stageTests,
  ...stagePlayTests,
  ...labelsTests,
};

try {
  for (const [name, run] of Object.entries(tests)) {
    if (only && !only.includes(name)) continue;
    const errors: string[] = [];
    let pass = false,
      detail: unknown;
    try {
      [pass, detail] = await run(errors);
    } catch (e) {
      detail = String(e);
    }
    if (errors.length) {
      pass = false;
      detail = { detail, pageErrors: errors };
    }
    results[name] = pass ? true : `FAIL ${JSON.stringify(detail)}`;
    ok &&= pass;
    console.error(`${pass ? 'pass' : 'FAIL'} ${name} ${JSON.stringify(detail)}`);
  }
} finally {
  await browser.close();
  server.close();
}
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
if (!ok) process.exit(1);
