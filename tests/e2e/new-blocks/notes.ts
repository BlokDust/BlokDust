// Silent Keys, the note effects and Random Note's and Chord's bars (CHG-0017, CHG-0040), run by
// tests/e2e/new-blocks.ts.
import type { Page } from 'playwright';
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
  savedParams,
  setParam,
  pointOf,
} from './harness.ts';
import type { OptionRow, OptionsBlock, RowShown } from '../pageGlobals.shared.ts';

/** What the open panel's row `setting` last drew. */
const shownOf = (page: Page, setting: string) =>
  page.evaluate((key): RowShown => {
    const row = (window.__bd_probe.scene.OptionsPanel.Options as OptionRow[]).find(
      (each) => each.Setting === key,
    );
    if (!row?.Shown) throw new Error(`no drawn row ${key}`);
    return row.Shown;
  }, setting);
/** css px of bar `bar` of the open panel's note bars, `level` of the way up and `raise` device px
 * higher. */
const barAt = (page: Page, bar: number, level: number, raise = 0) =>
  page.evaluate(
    ([index, fraction, up]): [number, number] => {
      const probe = window.__bd_probe,
        optionsPanel = probe.scene.OptionsPanel,
        pixelRatio = probe.v1App.Metrics.PixelRatio,
        shown = (optionsPanel.Options as OptionRow[]).find(
          (row) => row.Setting === 'noteBars',
        )?.Shown;
      if (!shown?.cells || shown.bottom === undefined || shown.top === undefined)
        throw new Error('no note bars drawn');
      return [
        (optionsPanel.Position.x + shown.cells[index]) / pixelRatio,
        (optionsPanel.Position.y + shown.bottom - (shown.bottom - shown.top) * fraction - up) /
          pixelRatio,
      ];
    },
    [bar, level, raise] as const,
  );

export const noteTests: Tests = {
  // CHG-0017: Silent Keys is a switch on the keyboards, off by default; on, held keys are silent
  // and a press (power) on the Tone plays them.
  async 'keys-set-pitch'(errors) {
    const page = await open(
      browser,
      [blk('t', 'source.tone', 0, 0), blk('k', 'input.computer-keyboard', 0, -3)],
      errors,
    );
    await openPanel(page, 'k');
    const switches = await page.evaluate(() => {
      const row = (window.__bd_probe.scene.OptionsPanel.Options as OptionRow[]).find(
        (each) => each.Type === 'switches',
      );
      if (!row) throw new Error('the keyboard has no switches');
      return row.Switches.map((each) => ({ name: each.Name, on: each.Selected }));
    });
    await setParam(page, 'keysSetPitch', true);
    // Close the panel.
    await page.mouse.click(200, 650);
    await page.waitForTimeout(500);
    const before = (await state(page)).gateOns;
    // C E G.
    await page.keyboard.down('KeyZ');
    await page.keyboard.down('KeyC');
    await page.keyboard.down('KeyB');
    await page.waitForTimeout(400);
    const held = (await state(page)).gateOns - before,
      quiet = (await state(page)).rms < 0.0005;
    const at = await pointOf(page, 't');
    await page.mouse.move(at[0], at[1]);
    await page.mouse.down();
    await page.waitForTimeout(400);
    const struck = (await state(page)).gateOns - before,
      loud = (await state(page)).rms > 0.005;
    await page.mouse.up();
    for (const key of ['KeyZ', 'KeyC', 'KeyB']) await page.keyboard.up(key);
    const saved = (await savedParams(page, 'k')).keysSetPitch;
    await page.close();
    const pass =
      switches.some((each) => each.name === 'Silent Keys' && !each.on) &&
      held === 0 &&
      quiet &&
      struck === 3 &&
      loud &&
      !!saved;
    return [pass, { sw: switches, held, quiet, struck, loud, saved }];
  },
  // CHG-0017: Chord, Arpeggiator and Random Note are in the Effect menu; a Chord by a powered Tone
  // sounds three voices; the Arpeggiator's panel has Speed, and Per Hit hides it.
  async 'note-effects'(errors) {
    const page = await open(
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
    const menu = await menuItems(page, 'Effect');
    const gateOns0 = (await state(page)).gateOns;
    await page.waitForTimeout(1000);
    const gateOns1 = (await state(page)).gateOns;
    await openPanel(page, 'arp');
    const timed = (await rows(page)).map((row) => row.name);
    await page.screenshot({ path: `${OUT}/arpeggiator.png` });
    await setParam(page, 'perHit', true);
    await page.waitForTimeout(300);
    const perHit = (await rows(page)).map((row) => row.name);
    await page.close();
    const randomPage = await open(browser, [blk('rn', 'fx.random-note', 0, 0)], errors);
    await openPanel(randomPage, 'rn');
    const random = (await rows(randomPage)).map((row) => ({ name: row.name, type: row.type }));
    await randomPage.screenshot({ path: `${OUT}/random-note.png` });
    await randomPage.close();
    // The arpeggiated Tone strikes about 10 notes a second.
    const steps = gateOns1 - gateOns0;
    const pass =
      ['Chord', 'Arpeggiator', 'Random Note'].every((name) => menu.includes(name)) &&
      steps >= 8 &&
      steps <= 12 &&
      timed.includes('Speed') &&
      timed.includes('Pattern') &&
      timed.includes('Octaves') &&
      !perHit.includes('Speed') &&
      // CHG-0040 (UI-0016)
      random.map((row) => row.name).join() === 'Notes,Key,Range';
    return [pass, { menu, steps, timed, perHit, random }];
  },
  // CHG-0040 (UI-0016, R10f, R10h): a press on a note bar sets it and shows its value; Key slides
  // the bars; Range's handles step by semitone, never crossing; a played note lights its bar.
  async 'note-bars'(errors) {
    const page = await open(
      browser,
      [
        blk('e', 'power.emitter', -8, 0, { angle: 0, selfPoweredMode: true, rate: 30, speed: 12 }),
        blk('t', 'source.tone', 0, 0),
        blk('rn', 'fx.random-note', 3, 0, { w0: 0, w2: 0, w4: 0, w5: 0, w7: 1, w9: 0, w11: 0 }),
      ],
      errors,
    );
    await openPanel(page, 'rn');
    const lastLit = () =>
      page.evaluate(
        () => (window.__bd_probe.scene.OptionsPanel.SelectedBlock as OptionsBlock).__bdLit,
      );
    await page
      .waitForFunction(
        () => (window.__bd_probe.scene.OptionsPanel.SelectedBlock as OptionsBlock).__bdLit,
        null,
        { timeout: 5000 },
      )
      .catch(() => null);
    const lit = (await shownOf(page, 'noteBars')).values,
      // A hit played G.
      litNow = (await lastLit())?.note;
    // Drag A (bar 9) to about half; sideways stays on A.
    const [x, y] = await barAt(page, 9, 0.5);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 30, y - 2, { steps: 4 });
    const held = await shownOf(page, 'noteBars');
    await page.screenshot({ path: `${OUT}/note-bars-drag.png` });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const afterDrag = await savedParams(page, 'rn');
    const draggedA = Number(afterDrag.w9);
    // Key D: the pattern slides two bars right.
    await setParam(page, 'key', 2);
    await page.waitForTimeout(200);
    const shifted = (await shownOf(page, 'noteBars')).values;
    // Range: the low handle dragged past the high one stops on it.
    const range0 = await shownOf(page, 'noteRange');
    const rangeY = await page.evaluate(() => {
      const probe = window.__bd_probe,
        optionsPanel = probe.scene.OptionsPanel,
        rangeRow = (optionsPanel.Options as OptionRow[]).find((row) => row.Setting === 'noteRange');
      if (!rangeRow) throw new Error('no Range row');
      return (
        (optionsPanel.Position.y + rangeRow.Position.y + rangeRow.Size.height / 2) /
        probe.v1App.Metrics.PixelRatio
      );
    });
    const pixelRatio = await page.evaluate(() => window.__bd_probe.v1App.Metrics.PixelRatio),
      panelX = await page.evaluate(() => window.__bd_probe.scene.OptionsPanel.Position.x);
    await page.mouse.move((panelX + (range0.lowX ?? 0)) / pixelRatio, rangeY);
    await page.mouse.down();
    await page.mouse.move((panelX + (range0.highX ?? 0)) / pixelRatio + 80, rangeY, { steps: 6 });
    const range1 = await shownOf(page, 'noteRange');
    await page.mouse.up();
    await page.waitForTimeout(200);
    const afterRange = await savedParams(page, 'rn');
    await page.close();
    // Chord: its bars are stepped and name their chord.
    const chordPage = await open(browser, [blk('ch', 'fx.chord', 0, 0)], errors);
    await openPanel(chordPage, 'ch');
    const chords = (await shownOf(chordPage, 'noteBars')).values;
    // Bar 2, 2/7 of the way up and 2 px higher.
    const [chordX, chordY] = await barAt(chordPage, 2, 2 / 7, 2);
    await chordPage.mouse.move(chordX, chordY);
    await chordPage.mouse.down();
    await chordPage.mouse.up();
    await chordPage.waitForTimeout(200);
    const chordSaved = await savedParams(chordPage, 'ch');
    const names = (await rows(chordPage)).map((row) => row.name);
    await chordPage.close();
    const pass =
      lit?.[7] === 1 &&
      litNow === 7 &&
      held.held === 9 &&
      draggedA > 0.4 &&
      draggedA < 0.6 &&
      afterDrag.w10 === undefined &&
      shifted?.[11] === afterDrag.w9 &&
      shifted?.[9] === 1 &&
      range0.low === 60 &&
      range0.high === 71 &&
      range1.low === 71 &&
      range1.high === 71 &&
      afterRange.low === 71 &&
      (afterRange.high ?? 71) === 71 &&
      chords?.join() === '3,7,5,3,2,7,7,6,7,5,3,2' &&
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
        r0: range0,
        r1: range1,
        afterRange,
        c0: chords,
        chordSaved,
        names,
      },
    ];
  },
};
