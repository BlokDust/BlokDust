// Silent Keys, the note effects and Random Note's and Chord's bars (CHG-0017, CHG-0040), run by
// tests/e2e/new-blocks.ts.
import {
  OUT,
  blk,
  browser,
  idOf,
  menuItems,
  open,
  openPanel,
  rows,
  state,
  type Tests,
} from './harness.ts';

export const noteTests: Tests = {
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
        .Switches.map((Switche: any) => ({ name: Switche.Name, on: !!Switche.Selected })),
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
        ([key, value]) => {
          const P = (window as any).__bd_probe,
            optionsPanel = P.scene.OptionsPanel,
            pr = P.v1App.Metrics.PixelRatio,
            shown = (optionsPanel.Options as any[]).find((x) => x.Setting === 'noteBars').Shown;
          return [
            (optionsPanel.Position.x + shown.cells[key]) / pr,
            (optionsPanel.Position.y + shown.bottom - (shown.bottom - shown.top) * value) / pr,
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
    const [x, y] = await barAt(9, 0.5);
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
        optionsPanel = P.scene.OptionsPanel,
        r = (optionsPanel.Options as any[]).find((x) => x.Setting === 'noteRange');
      return (
        (optionsPanel.Position.y + r.Position.y + r.Size.height / 2) / P.v1App.Metrics.PixelRatio
      );
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
        optionsPanel = P.scene.OptionsPanel,
        pr = P.v1App.Metrics.PixelRatio,
        shown = (optionsPanel.Options as any[]).find((x) => x.Setting === 'noteBars').Shown;
      return [
        (optionsPanel.Position.x + shown.cells[2]) / pr,
        (optionsPanel.Position.y + shown.bottom - (shown.bottom - shown.top) * (2 / 7) - 2) / pr,
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
};
