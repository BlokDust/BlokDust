// The Sound Laser and the Counter (CHG-0015, CHG-0016), run by tests/e2e/new-blocks.ts.
import {
  OUT,
  blk,
  browser,
  liveShown,
  menuItems,
  open,
  openPanel,
  rowPoint,
  rows,
  savedParams,
  setParam,
  state,
  type Tests,
} from './harness.ts';
import type { OptionRow } from '../pageGlobals.ts';

export const powerBlockTests: Tests = {
  // CHG-0016: a Sound Laser hears the Tone beside it; its beam powers a second Tone; a higher
  // threshold turns it off.
  async 'sound-laser'(errors) {
    const page = await open(
      browser,
      [
        blk('t', 'source.tone', 0, 0),
        blk('pw', 'power.power', -3, 0),
        blk('s', 'power.sound-laser', 3, 0, { angle: 0, hold: 0 }),
        blk('far', 'source.tone', 10, 0, { transpose: 7 }),
      ],
      errors,
    );
    await page.waitForTimeout(400);
    const onBeams = await page.evaluate(() => window.__bd_probe.beams);
    const powered = (await state(page)).powered;
    await openPanel(page, 's');
    await page.waitForTimeout(400);
    const panelRows = await rows(page);
    const meter = panelRows.find((row) => row.setting === 'soundMeter')?.shown;
    await page.screenshot({ path: `${OUT}/sound-laser.png` });
    await setParam(page, 'threshold', -3);
    await page.waitForTimeout(500);
    const offBeams = await page.evaluate(() => window.__bd_probe.beams);
    await setParam(page, 'whenQuieter', 1);
    await page.waitForTimeout(500);
    const invertedBeams = await page.evaluate(() => window.__bd_probe.beams);
    const saved = await savedParams(page, 's');
    const menu = await menuItems(page, 'Power');
    await page.close();
    const names = panelRows.map((row) => row.name);
    const pass =
      menu.includes('Sound Laser') &&
      onBeams === 1 &&
      powered.length >= 2 &&
      !!meter &&
      meter.on === true &&
      (meter.level ?? -Infinity) > -25 &&
      offBeams === 0 &&
      invertedBeams === 1 &&
      saved.invert === 1 &&
      saved.threshold === -3 &&
      ['Level', 'Band', 'Beam on', 'Hold', 'Angle', 'Range'].every((name) =>
        names.includes(name),
      ) &&
      !names.includes('Threshold') &&
      !names.includes('Rotate');
    return [pass, { onBeams, offBeams, invertedBeams, powered, meter, names, saved }];
  },
  // CHG-0015: Counter, Chance and Prism are in the Power menu; the Counter's panel shows its
  // pattern and step, and its Reset (R2c) goes back to step 1. It powers the Tone beside it.
  async 'counter-panel'(errors) {
    const page = await open(
      browser,
      [
        blk('e', 'power.emitter', -8, 0, { angle: 0, selfPoweredMode: true, rate: 30, speed: 12 }),
        blk('c', 'power.counter', 0, 0, { steps: 8, hits: 3 }),
        blk('t', 'source.tone', 0, 4),
      ],
      errors,
    );
    const menu = await menuItems(page, 'Power');
    await openPanel(page, 'c');
    const first = await liveShown(page);
    // A couple more particles.
    await page.waitForTimeout(1200);
    const later = await liveShown(page);
    await setParam(page, 'hits', 5);
    await page.waitForTimeout(300);
    const five = await liveShown(page);
    await page.screenshot({ path: `${OUT}/counter-panel.png` });
    const snapshot = await state(page);
    // A click on a step toggles it; moving Steps, Hits or Rotate gives the pattern back.
    const secondCell = five?.cells?.[1];
    if (secondCell === undefined) throw new Error('the Counter row drew no cells');
    const step2 = await page.evaluate((cellX): [number, number] => {
      const optionsPanel = window.__bd_probe.scene.OptionsPanel,
        pixelRatio = window.__bd_probe.v1App.Metrics.PixelRatio,
        patternRow = (optionsPanel.Options as OptionRow[]).find(
          (row) => row.Setting === 'counterPattern',
        );
      if (!patternRow) throw new Error('the Counter has no pattern row');
      return [
        (optionsPanel.Position.x + cellX) / pixelRatio,
        (optionsPanel.Position.y + patternRow.Position.y + patternRow.Size.height / 2) / pixelRatio,
      ];
    }, secondCell);
    await page.mouse.click(...step2);
    await page.waitForTimeout(300);
    const toggled = (await liveShown(page))?.pattern,
      mask = (await savedParams(page, 'c')).pattern;
    const hitsAt = await rowPoint(page, 'hits', 5 / 16);
    await page.mouse.click(...hitsAt);
    await page.waitForTimeout(300);
    const back = (await liveShown(page))?.pattern,
      cleared = (await savedParams(page, 'c')).pattern;
    // Reset: wait until the next step is 2–5, so one more hit in the meantime cannot bring it
    // back to 0 or 1 by itself.
    const nextStep = async () => (await liveShown(page))?.next ?? -1;
    let beforeReset = await nextStep();
    for (let i = 0; i < 60 && (beforeReset < 2 || beforeReset > 5); i++) {
      await page.waitForTimeout(100);
      beforeReset = await nextStep();
    }
    await page.mouse.click(...(await rowPoint(page, 'resetCounter', 0.5)));
    await page.waitForTimeout(150);
    const afterReset = await nextStep();
    await page.close();
    const pass =
      ['Counter', 'Chance', 'Prism', 'Gate'].every((name) => menu.includes(name)) &&
      first?.pattern === 'x..x..x.' &&
      !!later &&
      later.next !== first.next &&
      five?.pattern === 'x.x.xx.x' &&
      snapshot.hits > 0 &&
      snapshot.connections.length > 0 &&
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
        hits: snapshot.hits,
        connections: snapshot.connections,
        toggled,
        mask,
        back,
        cleared,
        beforeReset,
        afterReset,
      },
    ];
  },
};
