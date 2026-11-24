// Chance, the Gate and the Prism (CHG-0015, CHG-0032), run by tests/e2e/new-blocks.ts.
import {
  OUT,
  blk,
  browser,
  menuItems,
  open,
  openPanel,
  rows,
  state,
  type Tests,
} from './harness.ts';

export const powerGateTests: Tests = {
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
};
