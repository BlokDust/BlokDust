// ui-regressions: The MIDI Input block's options and device selector.
import { OUT, blk, browser, comp, state, type RegressionTest, url } from './harness.ts';

export const midiTests: Record<string, RegressionTest> = {
  /** CHG-0004 / PLUGIN-0004: the MIDI Input panel's own options (v1 option styles): MPE switch beside Mono/Poly,
   * Channel (OMNI/1–16) and, on the web, Device (ALL or an input by name); MPE on adds Pressure and Slide. A Web
   * MIDI message from the chosen device reaches the engine through the block's MPE parser; another device's does not.
   * Owner (2026-11-12, CHG-0010): a quieter panel. MPE on hides Channel (MPE uses every channel of its zone) and there
   * is no Bend row (always ±48, MPE's standard); Poly hides Glide (glide is mono-only). */
  async 'midi-input-options'(errors: string[]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(() => {
      const mk = (id: string, name: string) => ({ id, name, onmidimessage: null as any });
      const inputs = new Map([
        ['a', mk('a', 'Funputs MPE')],
        ['b', mk('b', 'Other Keys')],
      ]);
      (window as any).__fakeMidi = inputs;
      (navigator as any).requestMIDIAccess = () => Promise.resolve({ inputs, onstatechange: null });
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(
      `${url}/index.html?v1=${comp([blk(1, 'MIDIController', 0, 0), blk(2, 'ToneSource', 3, 0)])}`,
    );
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
    await p.waitForTimeout(800);
    const id = (await state(p)).blocks.find((b: any) => b.type === 'input.midi-controller').id;
    const pt = await p.evaluate((i) => (window as any).__bd_probe.blockPoint(i), id);
    await p.mouse.click(pt[0], pt[1]);
    await p.waitForTimeout(1000);
    const names = () =>
      p.evaluate(() =>
        (window as any).__bd_probe.scene.OptionsPanel.Options.map((Option: any) =>
          Option.Type === 'switches'
            ? Option.Switches.map((Switche: any) => Switche.Name).join('+')
            : Option.Name,
        ),
      );
    const before = await names();
    // Choose device 1 (Funputs) and MPE on through the block (the panel's SetParam path), as the sliders/switches do.
    await p.evaluate(() => {
      const selectedBlock = (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock;
      selectedBlock.SetParam('deviceIndex', 1);
      selectedBlock.SetParam('mpe', true);
    });
    await p.waitForTimeout(300);
    const after = await names();
    const params = (await state(p)).patch.blocks.find(
      (b: any) => b.type === 'input.midi-controller',
    ).params;
    const send = (dev: string, bytes: number[]) =>
      p.evaluate(
        ([key, b]) =>
          (window as any).__fakeMidi.get(key).onmidimessage({ data: new Uint8Array(b) }),
        [dev, bytes] as const,
      );
    const gate0 = (await state(p)).gateOns;
    await send('b', [0x91, 60, 100]);
    await p.waitForTimeout(300);
    const fromOther = (await state(p)).gateOns - gate0;
    await send('a', [0x91, 64, 100]);
    await p.waitForTimeout(300);
    const fromChosen = (await state(p)).gateOns - gate0 - fromOther;
    await p.screenshot({ path: `${OUT}/midi-input-options.png` });
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('polyphonic', true),
    );
    await p.waitForTimeout(300);
    const poly = await names();
    await ctx.close();
    const ok =
      JSON.stringify(before).includes('MPE') &&
      before.includes('Channel') &&
      before.includes('Device') &&
      before.includes('Glide') &&
      !after.includes('Bend') &&
      !after.includes('Channel') &&
      after.includes('Device') &&
      JSON.stringify(after).includes('Pressure+Slide') &&
      !poly.includes('Glide') &&
      poly.includes('Octave') &&
      params.device === 'Funputs MPE' &&
      !!params.mpe &&
      fromOther === 0 &&
      fromChosen === 1;
    return [
      ok,
      {
        before,
        after,
        poly,
        device: params.device,
        mpe: params.mpe,
        gateOnsFromOtherDevice: fromOther,
        fromChosenDevice: fromChosen,
      },
    ];
  },
  /** Owner (2026-11-12, CHG-0010): the MIDI Keyboard's Device is a selector like Settings' colour theme (arrows either
   * side, the name between), not a slider whose text ran off the panel. The arrows step through ALL and the inputs,
   * wrapping round; a long name is cut to fit between them. */
  async 'midi-device-selector'(errors: string[]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(() => {
      const mk = (id: string, name: string) => ({ id, name, onmidimessage: null as any });
      const inputs = new Map([
        ['a', mk('a', 'Funputs MPE')],
        ['b', mk('b', 'A Very Long MIDI Interface Name That Would Never Fit Port 1')],
      ]);
      (navigator as any).requestMIDIAccess = () => Promise.resolve({ inputs, onstatechange: null });
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(`${url}/index.html?v1=${comp([blk(1, 'MIDIController', 0, 0)])}`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
    await p.waitForTimeout(800);
    const id = (await state(p)).blocks[0].id;
    const pt = await p.evaluate((i) => (window as any).__bd_probe.blockPoint(i), id);
    await p.mouse.click(pt[0], pt[1]);
    await p.waitForTimeout(1000);
    const row = () =>
      p.evaluate(() => {
        const optionsPanel = (window as any).__bd_probe.scene.OptionsPanel,
          pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio,
          unit = (window as any).__bd_probe.v1App.Unit;
        const d = optionsPanel.Options.find((Option: any) => Option.Setting === 'deviceIndex'),
          y = (optionsPanel.Position.y + d.Position.y + d.Size.height / 2) / pr;
        return {
          type: d.Type,
          device: optionsPanel.SelectedBlock.Params.device || 'ALL',
          left: [(optionsPanel.Position.x + optionsPanel.Margin + 10 * unit) / pr, y],
          right: [
            (optionsPanel.Position.x + optionsPanel.Margin + optionsPanel.Range - 10 * unit) / pr,
            y,
          ],
          textWidth: d.TextWidth,
          room: optionsPanel.Range - 80 * unit,
        };
      });
    const seen: string[] = [];
    const first = await row();
    seen.push(first.device);
    for (let i = 0; i < 3; i++) {
      const r = await row();
      await p.mouse.click(r.right[0], r.right[1]);
      await p.waitForTimeout(250);
      seen.push((await row()).device);
    }
    const r = await row();
    await p.mouse.click(r.left[0], r.left[1]);
    await p.waitForTimeout(250);
    const back = await row();
    // The long name, drawn: it fits between the arrows.
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('deviceIndex', 2),
    );
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.RefreshOptionsPanel(),
    );
    const lr = await row();
    await p.mouse.move(lr.right[0] - 60, lr.right[1]);
    await p.mouse.move(lr.right[0] - 80, lr.right[1]); // a redraw
    await p.waitForTimeout(300);
    const long = await row();
    await p.screenshot({ path: `${OUT}/midi-device-selector.png` });
    await ctx.close();
    const ok =
      first.type === 'selector' &&
      JSON.stringify(seen) ===
        JSON.stringify([
          'ALL',
          'Funputs MPE',
          'A Very Long MIDI Interface Name That Would Never Fit Port 1',
          'ALL',
        ]) &&
      back.device === 'A Very Long MIDI Interface Name That Would Never Fit Port 1' &&
      long.textWidth > 0 &&
      long.textWidth <= long.room;
    return [
      ok,
      { type: first.type, seen, back: back.device, textWidth: long.textWidth, room: long.room },
    ];
  },
};
