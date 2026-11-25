// The sampler options panel: its region, its waveform and where it is drawn.
import { type Page } from 'playwright';
import type { V1BlockView } from './v1Views.ts';

/** The (only) sampler's region as the open options panel shows it and as the patch (→ engine)
 * holds it. */
export const regionOf = (page: Page, _id: number) =>
  page.evaluate(() => {
    const probe = window.__bd_probe,
      selectedBlock = probe.scene.OptionsPanel.SelectedBlock as V1BlockView | undefined,
      uiParams: Record<string, unknown> = selectedBlock?.Params ?? {},
      patchParams: Record<string, unknown> = probe.state.patch.blocks[0].params ?? {};
    const keys = ['startPosition', 'endPosition', 'loopStart', 'loopEnd'];
    return {
      ui: keys.map((key) => uiParams[key]),
      patch: keys.map((key) => patchParams[key]),
      reverse: [uiParams.reverse, patchParams.reverse],
      wave: (selectedBlock?.WaveForm ?? []).slice(),
    };
  });
export const near = (a: unknown[], b: unknown[], eps = 0.01) =>
  a.length === b.length &&
  a.every((x, i) => {
    const other = b[i];
    return typeof x === 'number' && typeof other === 'number' && Math.abs(x - other) < eps;
  });
/** Points in the waveform the open options panel draws (its wave option: waveimage, waveregion or
 * waveslider). */
export const waveDrawn = (page: Page) =>
  page.evaluate(() => {
    const optionsPanel = window.__bd_probe.scene.OptionsPanel;
    if (optionsPanel.Scale !== 1) return -1;
    const option = (
      optionsPanel.Options as (typeof optionsPanel.Options)[number][] | undefined
    )?.find((candidate) => candidate.Type.startsWith('wave'));
    return option ? ((option.Waveform as number[] | undefined) ?? []).length : -2;
  });
/** The open panel's wave option box in css px (for pixel checks). */
export const waveBox = (page: Page) =>
  page.evaluate(() => {
    const optionsPanel = window.__bd_probe.scene.OptionsPanel,
      option = optionsPanel.Options.find((candidate) => candidate.Type.startsWith('wave')),
      pr = devicePixelRatio;
    if (!option) throw new Error('no wave option in the open panel');
    return {
      x: (optionsPanel.Position.x + optionsPanel.Margin) / pr,
      y: (optionsPanel.Position.y + option.Position.y) / pr,
      width: optionsPanel.Range / pr,
      height: option.Size.height / pr,
    };
  });
