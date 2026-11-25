// The Compressor's meter, the emitter's Offset row, the Power and Laser panels and the Pulse's
// Delay (CHG-0014, CHG-0029), run by tests/e2e/new-blocks.ts.
import type { Page } from 'playwright';
import type { PrismOptionsPanel } from '../pageGlobals.shared.ts';
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
  savedParams,
  setParam,
} from './harness.ts';

export const blockPanelTests: Tests = {
  // CHG-0014: the Compressor is in the Effect menu; its panel shows the meter (level, threshold,
  // gain reduction).
  async 'compressor-panel'(errors) {
    const page = await open(
      browser,
      [
        blk('t', 'source.tone', 0, 0),
        blk('pw', 'power.power', -3, 0),
        blk('c', 'fx.compressor', 3, 0, { threshold: -40, ratio: 12 }),
      ],
      errors,
    );
    const inMenu = (await menuItems(page, 'Effect')).includes('Compressor');
    await openPanel(page, 'c');
    await page.waitForTimeout(600);
    const panelRows = await rows(page);
    await page.screenshot({ path: `${OUT}/compressor-panel.png` });
    const meter = panelRows.find((row) => row.setting === 'compMeter')?.shown;
    const names = panelRows.map((row) => row.name);
    const sounding = (await state(page)).rms > 0.001;
    // The Level meter's line is the Threshold (owner, 2026-11-14): drag it to the middle → −30 dB.
    const from = await rowPoint(page, 'compMeter', 20 / 60),
      to = await rowPoint(page, 'compMeter', 0.5);
    await page.mouse.move(...from);
    await page.mouse.down();
    await page.mouse.move(...to, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const dragged = Number((await savedParams(page, 'c')).threshold);
    await page.close();
    const pass =
      inMenu &&
      sounding &&
      meter?.level !== undefined &&
      meter.level > -40 &&
      meter.level < 0 &&
      meter.reduction !== undefined &&
      meter.reduction < -1 &&
      meter.thresholdX !== undefined &&
      meter.width !== undefined &&
      Math.abs(meter.thresholdX - meter.width * (20 / 60)) < 1 &&
      ['Level', 'Ratio', 'Knee', 'Attack', 'Release', 'Makeup'].every((name) =>
        names.includes(name),
      ) &&
      !names.includes('Threshold') &&
      Math.abs(dragged + 30) < 1;
    return [pass, { inMenu, sounding, meter, names, dragged }];
  },
  // CHG-0014: the emitter's Offset row, after Swing when synced and after Fire Rate when not.
  async 'emitter-offset-row'(errors) {
    const page = await open(
      browser,
      [blk('e', 'power.emitter', 0, 0, { sync: true, offset: 0.25 })],
      errors,
    );
    await openPanel(page, 'e');
    const synced = (await rows(page)).map((row) => row.name);
    await setParam(page, 'sync', false);
    await page.waitForTimeout(300);
    const free = (await rows(page)).map((row) => row.name);
    const saved = (await state(page)).patch.blocks[0]?.params?.offset;
    await page.close();
    const pass =
      synced.indexOf('Offset') === synced.indexOf('Swing') + 1 &&
      free.indexOf('Offset') === free.indexOf('Fire Rate') + 1 &&
      saved === 0.25;
    return [pass, { synced, free, saved }];
  },
  // The Power block's panel (Hits Cut Power); a Laser's Rotate sticks at 0; an emitter's panel
  // draws the way it fires.
  async 'power-gap-rotate-guide'(errors) {
    const page = await open(
      browser,
      [
        blk('pw', 'power.power', -8, 0),
        blk('l', 'power.laser', 0, 0, { rotate: 200 }),
        blk('e', 'power.emitter', 8, 0, { angle: 0 }),
      ],
      errors,
    );
    await openPanel(page, 'pw');
    const off = (await rows(page)).map((row) => (row.type === 'switches' ? 'switches' : row.name));
    await setParam(page, 'cutByHits', true);
    await page.waitForTimeout(300);
    const on = (await rows(page)).map((row) => (row.type === 'switches' ? 'switches' : row.name));
    const gapSaved = await savedParams(page, 'pw');
    await page.mouse.click(1100, 700);
    await page.waitForTimeout(500);
    await openPanel(page, 'l');
    const near = await rowPoint(page, 'rotate', 0.53);
    await page.mouse.move(...near);
    await page.mouse.down();
    await page.waitForTimeout(100);
    const snapped = (await savedParams(page, 'l')).rotate ?? 0;
    await page.waitForTimeout(700);
    await page.mouse.move(near[0] + 2, near[1]);
    await page.mouse.move(near[0], near[1]);
    await page.mouse.up();
    const fine = Number((await savedParams(page, 'l')).rotate ?? 0);
    await page.mouse.click(1100, 700);
    await page.waitForTimeout(500);
    await openPanel(page, 'e');
    const guide = await page.evaluate(
      () => (window.__bd_probe.scene.OptionsPanel as PrismOptionsPanel).PrismExits,
    );
    await page.screenshot({ path: `${OUT}/emitter-guide.png` });
    await page.close();
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
  // CHG-0029 (R2b, SIMULATION-0010): the Pulse's Delay row (seconds; musical steps when synced)
  // is saved and reaches the engine: the same patch sounds `delay` later.
  async 'pulse-delay'(errors) {
    const scene = (delay: number) => [
      blk('e', 'power.emitter', -10, 0, { angle: 0, selfPoweredMode: true, speed: 6, rate: 200 }),
      blk('pu', 'power.pulse', 0, 0, { delay, pulseLength: 0.3 }),
      blk('t', 'source.tone', 0, 5),
    ];
    /** Seconds from START until it first sounds. */
    const onset = async (page: Page) => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < 6000) {
        if ((await state(page)).rms > 0.002) return (Date.now() - startedAt) / 1000;
        await page.waitForTimeout(20);
      }
      return -1;
    };
    const undelayed = await open(browser, scene(0), errors);
    const at0 = await onset(undelayed);
    await undelayed.close();
    const page = await open(browser, scene(1), errors);
    const at1 = await onset(page);
    await openPanel(page, 'pu');
    const free = (await rows(page)).map((row) => (row.type === 'switches' ? 'switches' : row.name));
    // Half of 0–4 s.
    const drag = await rowPoint(page, 'delay', 0.5);
    await page.mouse.move(drag[0] - 30, drag[1]);
    await page.mouse.down();
    await page.mouse.move(drag[0], drag[1], { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const dragged = Number((await savedParams(page, 'pu')).delay);
    await page.screenshot({ path: `${OUT}/pulse-delay.png` });
    await setParam(page, 'sync', true);
    await page.waitForTimeout(300);
    const synced = (await rows(page)).map((row) =>
      row.type === 'switches' ? 'switches' : row.name,
    );
    // Index 6: an eighth.
    await setParam(page, 'pulseDelayIndex', 6);
    await page.waitForTimeout(300);
    const saved = await savedParams(page, 'pu');
    await page.close();
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
