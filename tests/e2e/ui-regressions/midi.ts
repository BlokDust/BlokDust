// ui-regressions: The MIDI Input block's options and device selector.
import { OUT, blk, browser, comp, state, type RegressionTest, url } from './harness.ts';
import type { FakeMidiInput } from '../pageGlobals.ts';
import type { V1BlockView } from './v1Views.ts';

export const midiTests: Record<string, RegressionTest> = {
  /** CHG-0004, PLUGIN-0004, CHG-0010: MIDI Input options (MPE, Channel, Device; MPE adds Pressure
   * and Slide, hides Channel); only the chosen device's messages play; Poly hides Glide. */
  async 'midi-input-options'(errors: string[]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(() => {
      const input = (id: string, name: string): FakeMidiInput => ({
        id,
        name,
        onmidimessage: null,
      });
      const inputs = new Map([
        ['a', input('a', 'Funputs MPE')],
        ['b', input('b', 'Other Keys')],
      ]);
      window.__fakeMidi = inputs;
      Object.assign(navigator, {
        requestMIDIAccess: () => Promise.resolve({ inputs, onstatechange: null }),
      });
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(
      `${url}/index.html?v1=${comp([blk(1, 'MIDIController', 0, 0), blk(2, 'ToneSource', 3, 0)])}`,
    );
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForFunction(() => window.__bd_probe.state.snapshots > 10);
    await page.waitForTimeout(800);
    const midi = (await state(page)).blocks.find((b) => b.type === 'input.midi-controller');
    if (!midi) throw new Error('no MIDI Input');
    const point = await page.evaluate((i) => window.__bd_probe.blockPoint(i), midi.id);
    if (!point) throw new Error('the MIDI Input is not on screen');
    await page.mouse.click(point[0], point[1]);
    await page.waitForTimeout(1000);
    const names = () =>
      page.evaluate(() =>
        window.__bd_probe.scene.OptionsPanel.Options.map((row) =>
          row.Type === 'switches'
            ? (row.Switches ?? []).map((toggle) => toggle.Name).join('+')
            : row.Name,
        ),
      );
    const before = await names();
    // Device 1 (Funputs) and MPE on through the block's SetParam, as the panel's controls do.
    await page.evaluate(() => {
      const selectedBlock = window.__bd_probe.scene.OptionsPanel.SelectedBlock as V1BlockView;
      selectedBlock.SetParam('deviceIndex', 1);
      selectedBlock.SetParam('mpe', true);
    });
    await page.waitForTimeout(300);
    const after = await names();
    const params =
      (await state(page)).patch.blocks.find((b) => b.type === 'input.midi-controller')?.params ??
      {};
    const send = (dev: string, bytes: number[]) =>
      page.evaluate(
        ([key, data]) => {
          window.__fakeMidi?.get(key)?.onmidimessage?.({ data: new Uint8Array(data) });
        },
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
    await page.evaluate(() => {
      (window.__bd_probe.scene.OptionsPanel.SelectedBlock as V1BlockView).SetParam(
        'polyphonic',
        true,
      );
    });
    await page.waitForTimeout(300);
    const poly = await names();
    await context.close();
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
  /** CHG-0010: MIDI Device is a selector like the colour theme's: arrows step through ALL and the
   * inputs, wrapping round, and a long name is cut to fit between them. */
  async 'midi-device-selector'(errors: string[]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(() => {
      const input = (id: string, name: string): FakeMidiInput => ({
        id,
        name,
        onmidimessage: null,
      });
      const inputs = new Map([
        ['a', input('a', 'Funputs MPE')],
        ['b', input('b', 'A Very Long MIDI Interface Name That Would Never Fit Port 1')],
      ]);
      Object.assign(navigator, {
        requestMIDIAccess: () => Promise.resolve({ inputs, onstatechange: null }),
      });
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${url}/index.html?v1=${comp([blk(1, 'MIDIController', 0, 0)])}`);
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForFunction(() => window.__bd_probe.state.snapshots > 10);
    await page.waitForTimeout(800);
    const id = (await state(page)).blocks[0].id;
    const point = await page.evaluate((i) => window.__bd_probe.blockPoint(i), id);
    if (!point) throw new Error('the MIDI Input is not on screen');
    await page.mouse.click(point[0], point[1]);
    await page.waitForTimeout(1000);
    const row = () =>
      page.evaluate(() => {
        const optionsPanel = window.__bd_probe.scene.OptionsPanel,
          pr = window.__bd_probe.v1App.Metrics.PixelRatio,
          unit = window.__bd_probe.v1App.Unit;
        const option = optionsPanel.Options.find((row) => row.Setting === 'deviceIndex');
        if (!option) throw new Error('no Device option');
        const y = (optionsPanel.Position.y + option.Position.y + option.Size.height / 2) / pr,
          device = (optionsPanel.SelectedBlock as V1BlockView).Params.device;
        return {
          type: option.Type,
          device: typeof device === 'string' && device ? device : 'ALL',
          left: [(optionsPanel.Position.x + optionsPanel.Margin + 10 * unit) / pr, y],
          right: [
            (optionsPanel.Position.x + optionsPanel.Margin + optionsPanel.Range - 10 * unit) / pr,
            y,
          ],
          textWidth: (option as typeof option & { TextWidth: number }).TextWidth,
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
    const current = await row();
    await page.mouse.click(current.left[0], current.left[1]);
    await page.waitForTimeout(250);
    const back = await row();
    // The long name, drawn: it fits between the arrows.
    await page.evaluate(() => {
      (window.__bd_probe.scene.OptionsPanel.SelectedBlock as V1BlockView).SetParam(
        'deviceIndex',
        2,
      );
    });
    await page.evaluate(() => {
      (window.__bd_probe.scene.OptionsPanel.SelectedBlock as V1BlockView).RefreshOptionsPanel();
    });
    const lr = await row();
    await page.mouse.move(lr.right[0] - 60, lr.right[1]);
    await page.mouse.move(lr.right[0] - 80, lr.right[1]); // a redraw
    await page.waitForTimeout(300);
    const long = await row();
    await page.screenshot({ path: `${OUT}/midi-device-selector.png` });
    await context.close();
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
