// The Compressor's meter, the emitter's Offset row, the Power and Laser panels and the Pulse's Delay
// (CHG-0014, CHG-0029), run by tests/e2e/new-blocks.ts.
import type { Page } from 'playwright';
import {
  OUT,
  blk,
  browser,
  menuItems,
  open,
  openPanel,
  rowPoint,
  rows,
  state,
  type Tests,
} from './harness.ts';

export const blockPanelTests: Tests = {
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
};
