// The LFO aims at a block's parameter (CHG-0018), run by tests/e2e/new-blocks.ts.
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

export const lfoTests: Tests = {
  // CHG-0018: an LFO beside a Volume aims at its Level; the Volume's open slider follows; the patch keeps the target by
  // block id and the Level where it was set. The carousel lists "Block · Param" for what is connected.
  async lfo(errors) {
    const p = await open(
      browser,
      [
        blk('t', 'source.tone', 0, 0),
        blk('pw', 'power.power', -3, 0),
        blk('v', 'fx.volume', 3, 0, { gain: 0 }),
        blk('l', 'fx.lfo', 7, 0, { target: 'v:gain', rate: 2, depth: 1, targetBlock: 99 }),
      ],
      errors,
    );
    const menu = await menuItems(p, 'Effect');
    // Heard: the level swings, so the loudness differs between moments.
    const levels: number[] = [];
    for (let i = 0; i < 12; i++) {
      await p.waitForTimeout(90);
      levels.push((await state(p)).rms);
    }
    await openPanel(p, 'v');
    const seen: number[] = [];
    for (let i = 0; i < 8; i++) {
      await p.waitForTimeout(80);
      seen.push(
        await p.evaluate(
          () =>
            ((window as any).__bd_probe.scene.OptionsPanel.Options as any[]).find(
              (o) => o.Setting === 'gain',
            ).Followed as number,
        ),
      );
    }
    await p.screenshot({ path: `${OUT}/lfo-follow.png` });
    await p.mouse.click(200, 650);
    await p.waitForTimeout(500);
    const q = await open(
      browser,
      [
        blk('t', 'source.tone', 0, 0),
        blk('v', 'fx.volume', 3, 0),
        blk('l', 'fx.lfo', 0, 3, { target: 'v:gain' }),
      ],
      errors,
    );
    await openPanel(q, 'l');
    const target = () =>
      q.evaluate(() => {
        const o = ((window as any).__bd_probe.scene.OptionsPanel.Options as any[]).find(
          (x) => x.Setting === 'lfoTarget',
        );
        return String(o.DisplayConversion(o.Value));
      });
    const first = await target();
    const list = await q.evaluate(() =>
      ((window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.LfoTargets as any[]).map(
        (t) => t.label,
      ),
    );
    await q.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('lfoTarget', 1),
    ); // the first entry: the Tone's Note
    await q.waitForTimeout(300);
    const second = await target();
    const names = (await rows(q)).map((x) => x.name);
    await q.screenshot({ path: `${OUT}/lfo-panel.png` });
    const saved = (await state(q)).patch.blocks.find((b: any) => b.id === 'l').params;
    const savedGain = (await state(p)).patch.blocks.find((b: any) => b.id === 'v').params.gain;
    await p.close();
    await q.close();
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
      ['Target', 'Shape', 'Rate', 'Depth', 'Phase'].every((n) => names.includes(n));
    return [pass, { swing, seen, savedGain, first, list, second, saved, names }];
  },
};
