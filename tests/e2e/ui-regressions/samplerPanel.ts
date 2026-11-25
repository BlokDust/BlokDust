// The sampler options panel: its region, its waveform and where it is drawn.
import { type Page } from 'playwright';

/** The (only) sampler's region as the open options panel shows it and as the patch (→ engine) holds it. */
export const regionOf = (page: Page, _id: number) =>
  page.evaluate(() => {
    const probe = window.__bd_probe,
      selectedBlock = probe.scene.OptionsPanel.SelectedBlock,
      patchBlock = probe.state.patch.blocks[0];
    const keys = ['startPosition', 'endPosition', 'loopStart', 'loopEnd'];
    return {
      ui: keys.map((k) => selectedBlock?.Params[k]),
      patch: keys.map((k) => patchBlock.params[k]),
      reverse: [selectedBlock?.Params.reverse, patchBlock.params.reverse],
      wave: (selectedBlock?.WaveForm ?? []).slice() as number[],
    };
  });
export const near = (a: unknown[], b: unknown[], eps = 0.01) =>
  a.length === b.length &&
  a.every((x, i) => typeof x === 'number' && typeof b[i] === 'number' && Math.abs(x - b[i]) < eps);
/** Points in the waveform the open options panel draws (its wave option: waveimage / waveregion / waveslider). */
export const waveDrawn = (page: Page) =>
  page.evaluate(() => {
    const optionsPanel = window.__bd_probe.scene.OptionsPanel;
    if (optionsPanel.Scale !== 1) return -1;
    const option = (optionsPanel.Options ?? []).find((x) => x.Type.startsWith('wave'));
    return option ? (option.Waveform ?? []).length : -2;
  }) as Promise<number>;
/** The open panel's wave option box in css px (for pixel checks). */
export const waveBox = (page: Page) =>
  page.evaluate(() => {
    const optionsPanel = window.__bd_probe.scene.OptionsPanel,
      option = optionsPanel.Options.find((Option) => Option.Type.startsWith('wave')),
      pr = devicePixelRatio;
    return {
      x: (optionsPanel.Position.x + optionsPanel.Margin) / pr,
      y: (optionsPanel.Position.y + option.Position.y) / pr,
      width: optionsPanel.Range / pr,
      height: option.Size.height / pr,
    };
  });
