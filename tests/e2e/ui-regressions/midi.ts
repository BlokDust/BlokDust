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
      window.__fakeMidi = inputs;
      (navigator as any).requestMIDIAccess = () => Promise.resolve({ inputs, onstatechange: null });
    });
    const page = await ctx.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(
      `${url}/index.html?v1=${comp([blk(1, 'MIDIController', 0, 0), blk(2, 'ToneSource', 3, 0)])}`,
    );
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForFunction(() => window.__bd_probe.state.snapshots > 10);
    await page.waitForTimeout(800);
    const id = (await state(page)).blocks.find((b) => b.type === 'input.midi-controller').id;
    const pt = await page.evaluate((i) => window.__bd_probe.blockPoint(i), id);
    await page.mouse.click(pt[0], pt[1]);
    await page.waitForTimeout(1000);
    const names = () =>
      page.evaluate(() =>
        window.__bd_probe.scene.OptionsPanel.Options.map((Option) =>
          Option.Type === 'switches'
            ? Option.Switches.map((Switche) => Switche.Name).join('+')
            : Option.Name,
        ),
      );
    const before = await names();
    // Choose device 1 (Funputs) and MPE on through the block (the panel's SetParam path), as the sliders/switches do.
    await page.evaluate(() => {
      const selectedBlock = window.__bd_probe.scene.OptionsPanel.SelectedBlock;
      selectedBlock.SetParam('deviceIndex', 1);
      selectedBlock.SetParam('mpe', true);
    });
    await page.waitForTimeout(300);
    const after = await names();
    const params = (await state(page)).patch.blocks.find(
      (b) => b.type === 'input.midi-controller',
    ).params;
    const send = (dev: string, bytes: number[]) =>
      page.evaluate(
        ([key, b]) =>
          window.__fakeMidi.get(key).onmidimessage({ data: new Uint8Array(b) }),
        [dev, bytes] as const,
      );
    const gate0 = (await state(page)).gateOns;
    await send('b', [0x91, 60, 100]);
    await page.waitForTimeout(300);
    const fromOther = (await state(page)).gateOns - gate0;
    await send('a', [0x91, 64, 100]);
    await page.waitForTimeout(300);
    const fromChosen = (await state(page)).gateOns - gate0 - fromOther;
    await page.screenshot({ path: `${OUT}/midi-input-options.png` });
    await page.evaluate(() =>
      window.__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('polyphonic', true),
    );
    await page.waitForTimeout(300);
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
    const page = await ctx.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${url}/index.html?v1=${comp([blk(1, 'MIDIController', 0, 0)])}`);
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForFunction(() => window.__bd_probe.state.snapshots > 10);
    await page.waitForTimeout(800);
    const id = (await state(page)).blocks[0].id;
    const pt = await page.evaluate((i) => window.__bd_probe.blockPoint(i), id);
    await page.mouse.click(pt[0], pt[1]);
    await page.waitForTimeout(1000);
    const row = () =>
      page.evaluate(() => {
        const optionsPanel = window.__bd_probe.scene.OptionsPanel,
          pr = window.__bd_probe.v1App.Metrics.PixelRatio,
          unit = window.__bd_probe.v1App.Unit;
        const option = optionsPanel.Options.find((Option) => Option.Setting === 'deviceIndex'),
          y = (optionsPanel.Position.y + option.Position.y + option.Size.height / 2) / pr;
        return {
          type: option.Type,
          device: optionsPanel.SelectedBlock.Params.device || 'ALL',
          left: [(optionsPanel.Position.x + optionsPanel.Margin + 10 * unit) / pr, y],
          right: [
            (optionsPanel.Position.x + optionsPanel.Margin + optionsPanel.Range - 10 * unit) / pr,
            y,
          ],
          textWidth: option.TextWidth,
          room: optionsPanel.Range - 80 * unit,
        };
      });
    const seen: string[] = [];
    const first = await row();
    seen.push(first.device);
    for (let i = 0; i < 3; i++) {
      const result = await row();
      await page.mouse.click(result.right[0], result.right[1]);
      await page.waitForTimeout(250);
      seen.push((await row()).device);
    }
    const r = await row();
    await page.mouse.click(r.left[0], r.left[1]);
    await page.waitForTimeout(250);
    const back = await row();
    // The long name, drawn: it fits between the arrows.
    await page.evaluate(() =>
      window.__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('deviceIndex', 2),
    );
    await page.evaluate(() =>
      window.__bd_probe.scene.OptionsPanel.SelectedBlock.RefreshOptionsPanel(),
    );
    const lr = await row();
    await page.mouse.move(lr.right[0] - 60, lr.right[1]);
    await page.mouse.move(lr.right[0] - 80, lr.right[1]); // a redraw
    await page.waitForTimeout(300);
    const long = await row();
    await page.screenshot({ path: `${OUT}/midi-device-selector.png` });
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
