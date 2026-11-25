// The LFO aims at a block's parameter (CHG-0018), run by tests/e2e/new-blocks.ts.
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
import type { OptionRow, OptionsBlock } from '../pageGlobals.ts';

export const lfoTests: Tests = {
  // CHG-0018: an LFO beside a Volume aims at its Level; the Volume's open slider follows; the patch
  // keeps the target by block id and the Level where it was set. Targets read "Block · Param".
  async lfo(errors) {
    const page = await open(
      browser,
      [
        blk('t', 'source.tone', 0, 0),
        blk('pw', 'power.power', -3, 0),
        blk('v', 'fx.volume', 3, 0, { gain: 0 }),
        blk('l', 'fx.lfo', 7, 0, { target: 'v:gain', rate: 2, depth: 1, targetBlock: 99 }),
      ],
      errors,
    );
    const menu = await menuItems(page, 'Effect');
    // Heard: the level swings, so the loudness differs between moments.
    const levels: number[] = [];
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(90);
      levels.push((await state(page)).rms);
    }
    await openPanel(page, 'v');
    const seen: number[] = [];
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(80);
      seen.push(
        await page.evaluate(() => {
          const gain = (window.__bd_probe.scene.OptionsPanel.Options as OptionRow[]).find(
            (row) => row.Setting === 'gain',
          );
          if (gain?.Followed === undefined) throw new Error('the Volume has no followed Level row');
          return gain.Followed;
        }),
      );
    }
    await page.screenshot({ path: `${OUT}/lfo-follow.png` });
    await page.mouse.click(200, 650);
    await page.waitForTimeout(500);
    const panelPage = await open(
      browser,
      [
        blk('t', 'source.tone', 0, 0),
        blk('v', 'fx.volume', 3, 0),
        blk('l', 'fx.lfo', 0, 3, { target: 'v:gain' }),
      ],
      errors,
    );
    await openPanel(panelPage, 'l');
    const target = () =>
      panelPage.evaluate(() => {
        const row = (window.__bd_probe.scene.OptionsPanel.Options as OptionRow[]).find(
          (option) => option.Setting === 'lfoTarget',
        );
        if (!row?.DisplayConversion) throw new Error('the LFO has no Target row');
        return row.DisplayConversion(row.Value);
      });
    const first = await target();
    const list = await panelPage.evaluate(() =>
      ((window.__bd_probe.scene.OptionsPanel.SelectedBlock as OptionsBlock).LfoTargets ?? []).map(
        (lfoTarget) => lfoTarget.label,
      ),
    );
    // The first entry: the Tone's Note.
    await setParam(panelPage, 'lfoTarget', 1);
    await panelPage.waitForTimeout(300);
    const second = await target();
    const names = (await rows(panelPage)).map((row) => row.name);
    await panelPage.screenshot({ path: `${OUT}/lfo-panel.png` });
    const saved = await savedParams(panelPage, 'l');
    const savedGain = (await savedParams(page, 'v')).gain;
    await page.close();
    await panelPage.close();
    const swing = Math.max(...levels) / Math.max(1e-6, Math.min(...levels));
    const pass =
      menu.includes('LFO') &&
      swing > 2 &&
      Math.max(...seen) - Math.min(...seen) > 5 &&
      savedGain === 0 &&
      first === 'VOLUME · LEVEL' &&
      list.join() === 'TONE · NOTE,TONE · FINE,VOLUME · LEVEL' &&
      second === 'TONE · NOTE' &&
      saved.target === 't:transpose' &&
      ['Target', 'Shape', 'Rate', 'Depth', 'Phase'].every((name) => names.includes(name));
    return [pass, { swing, seen, savedGain, first, list, second, saved, names }];
  },
};
