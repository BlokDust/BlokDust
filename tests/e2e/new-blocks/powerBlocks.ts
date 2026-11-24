// The Sound Laser and the Counter (CHG-0015, CHG-0016), run by tests/e2e/new-blocks.ts.
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

export const powerBlockTests: Tests = {
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
      const optionsPanel = (window as any).__bd_probe.scene.OptionsPanel,
        pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio,
        r = (optionsPanel.Options as any[]).find((q) => q.Setting === 'counterPattern');
      return [
        (optionsPanel.Position.x + x) / pr,
        (optionsPanel.Position.y + r.Position.y + r.Size.height / 2) / pr,
      ];
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
};
