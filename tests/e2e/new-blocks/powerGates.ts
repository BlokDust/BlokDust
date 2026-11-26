// Chance, the Gate and the Prism (CHG-0015, CHG-0032), run by tests/e2e/new-blocks.ts.
import {
  OUT,
  blk,
  browser,
  menuItems,
  open,
  openPanel,
  rows,
  savedParams,
  setParam,
  state,
  type Tests,
} from './harness.ts';
import type { OptionsBlock } from '../pageGlobals.ts';

export const powerGateTests: Tests = {
  // CHG-0015 (SPEC-SIMULATION R2d): a Chance at 100% switches the Tone beside it on and holds it
  // (one note); at 0% it switches it off and it never sounds again.
  async 'chance-fires'(errors) {
    const page = await open(
      browser,
      [
        blk('e', 'power.emitter', -8, 0, { angle: 0, selfPoweredMode: true, rate: 30, speed: 12 }),
        blk('c', 'power.chance', 0, 0, { chance: 1 }),
        blk('t', 'source.tone', 0, 4),
      ],
      errors,
    );
    const inMenu = (await menuItems(page, 'Power')).includes('Chance');
    await page.waitForTimeout(1500);
    const snapshot = await state(page),
      notes = snapshot.gateOns;
    await openPanel(page, 'c');
    const names = (await rows(page)).map((row) => row.name);
    await setParam(page, 'chance', 0);
    await page.waitForTimeout(300);
    const gateOnsAtZero = (await state(page)).gateOns;
    await page.waitForTimeout(1500);
    const never = (await state(page)).gateOns - gateOnsAtZero;
    await page.close();
    const pass =
      inMenu &&
      snapshot.connections.length > 0 &&
      notes === 1 &&
      names.includes('Chance') &&
      never === 0;
    return [pass, { inMenu, connections: snapshot.connections, notes, names, never }];
  },
  // CHG-0032 (SPEC-SIMULATION R7c, SIMULATION-0011): the Gate is in the Power menu and stops a beam
  // until a Power beside it opens it; Invert swaps that.
  async gate(errors) {
    const page = await open(
      browser,
      [
        blk('l', 'power.laser', -8, 0, { angle: 0, selfPoweredMode: true }),
        blk('g', 'power.gate', 0, 0),
        blk('t', 'source.tone', 8, 0),
      ],
      errors,
    );
    const inMenu = (await menuItems(page, 'Power')).includes('Gate');
    await page.waitForTimeout(500);
    const closed = (await state(page)).rms;
    await page.screenshot({ path: `${OUT}/gate-closed.png` });
    await openPanel(page, 'g');
    const names = await page.evaluate(() =>
      (
        window.__bd_probe.scene.OptionsPanel.SelectedBlock as OptionsBlock
      ).OptionsForm.parameters.flatMap((param) =>
        param.type === 'switches' ? (param.switches ?? []).map((each) => each.name) : [param.name],
      ),
    );
    await setParam(page, 'invert', true);
    await page.waitForTimeout(600);
    const inverted = (await state(page)).rms;
    const saved = (await savedParams(page, 'g')).invert;
    await page.screenshot({ path: `${OUT}/gate.png` });
    await page.close();
    const pass =
      inMenu && closed < 0.0005 && inverted > 0.001 && names.includes('Invert') && saved === 1;
    return [pass, { inMenu, closed, inverted, names, saved }];
  },
  // CHG-0015: a Prism splits a laser's beam into its streams, and its panel draws the exit lines on
  // the stage.
  async 'prism-splits-beam'(errors) {
    const page = await open(
      browser,
      [
        blk('l', 'power.laser', -6, 0, { angle: 0, selfPoweredMode: true, range: 300 }),
        blk('pr', 'power.prism', 0, 0, { angle: -90, streams: 3, spread: 90 }),
        blk('t', 'source.tone', 0, -8),
      ],
      errors,
    );
    await page.waitForTimeout(400);
    const beams = await page.evaluate(() => window.__bd_probe.beams);
    // The middle stream points at the Tone.
    const sounding = (await state(page)).rms > 0.001;
    await openPanel(page, 'pr');
    await page.waitForTimeout(300);
    const exits = await page.evaluate(() => window.__bd_probe.scene.OptionsPanel.PrismExits);
    const names = (await rows(page)).map((row) => row.name);
    await page.screenshot({ path: `${OUT}/prism.png` });
    await page.close();
    const up = exits?.[1],
      pass =
        beams === 4 &&
        sounding &&
        exits?.length === 3 &&
        !!up &&
        Math.abs(up[0]) < 0.5 &&
        up[1] < 0 &&
        ['Angle', 'Rotate', 'Streams', 'Spread'].every((name) => names.includes(name));
    return [pass, { beams, sounding, exits, names }];
  },
};
