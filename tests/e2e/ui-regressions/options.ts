// ui-regressions: Block options panels: tempo sync, input gain, filter types and effect order.
import {
  OUT,
  blk,
  browser,
  maxOver,
  open,
  state,
  toCss,
  type RegressionTest,
  url,
} from './harness.ts';
import { openPlugin, plugPatch } from './pluginPage.ts';

export const optionsTests: Record<string, RegressionTest> = {
  /** CHG-0004 3.5: Emitter and Pulse panels get a Tempo Sync switch (v1 option styles); on, the Emitter shows Division,
   * the Pulse its Length, in musical steps. The patch saves the tempo and the synced params. Owner (2026-11-10): the
   * Stereo Delay syncs too (Delay in place of Delay Time), and the tempo is set once in Settings, not on each block. */
  async 'tempo-sync-options'(errors: string[]) {
    // Owner (Phase 3 review): Angle, then Tempo Sync; synced, Division (with triplets) and Swing replace Fire Rate and
    // P. Speed; the Pulse's Length replaces Pulse length; a synced Laser's Turn replaces Rotate. New Emitters and Pulses
    // from the menu start synced; saved ones without the setting keep v1 timing.
    const p = await open(
      browser,
      [
        blk(1, 'ParticleEmitter', 0, 0),
        blk(2, 'Pulse', 6, 0),
        blk(3, 'Laser', -6, 4),
        blk(4, 'StereoDelay', 6, 6),
      ],
      errors,
    );
    const names = () =>
      p.evaluate(() =>
        (window as any).__bd_probe.scene.OptionsPanel.Options.map((Option: any) =>
          Option.Type === 'switches'
            ? Option.Switches.map((Switche: any) => Switche.Name).join('+')
            : Option.Name,
        ),
      );
    const rows = async (type: string) => {
      const id = (await state(p)).blocks.find((b: any) => b.type === type).id;
      const pt = await p.evaluate((i) => (window as any).__bd_probe.blockPoint(i), id);
      await p.mouse.click(pt[0], pt[1]);
      await p.waitForTimeout(1000);
      return names();
    };
    const set = (k: string, v: unknown) =>
      p.evaluate(
        ([key, val]) =>
          (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam(key, val),
        [k, v] as const,
      );
    const close = async () => {
      await p.mouse.click(1100, 700);
      await p.waitForTimeout(600);
    };
    const emitterOff = await rows('power.emitter');
    await set('sync', true);
    await set('divisionIndex', 4);
    await set('swing', 0.5);
    await p.evaluate(() => (window as any).__bd_probe.scene.host.setTempo(90)); // Settings › Tempo (settings-release1)
    await p.waitForTimeout(200);
    const emitterOn = await names();
    await p.mouse.move(700, 300);
    await p.mouse.move(705, 305);
    await p.waitForTimeout(300); // the stage redraws on input
    await p.screenshot({ path: `${OUT}/tempo-sync-emitter.png` });
    await close();
    const pulseOff = await rows('power.pulse');
    await set('sync', true);
    await set('lengthIndex', 7);
    await p.waitForTimeout(200);
    const pulseOn = await names();
    await close();
    const laserOff = await rows('power.laser');
    await set('sync', true);
    await p.waitForTimeout(200);
    await set('turnIndex', 5);
    await p.waitForTimeout(200);
    const laserOn = await names();
    await p.mouse.move(700, 300);
    await p.mouse.move(705, 305);
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/tempo-sync-laser.png` });
    await close();
    const delayOff = await rows('fx.stereo-delay');
    await set('sync', true);
    await p.waitForTimeout(200);
    await set('delayIndex', 7);
    await p.waitForTimeout(200);
    const delayOn = await names();
    await p.mouse.move(700, 300);
    await p.mouse.move(705, 305);
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/tempo-sync-delay.png` });
    await close();
    const patch = (await state(p)).patch;
    // A new Emitter from the menu starts synced.
    const fresh = await p.evaluate(() => {
      const s = (window as any).__bd_probe.scene;
      const id = s.host.createBlock('ParticleEmitter', 0, -8);
      return id;
    });
    await p.mouse.up();
    await p.waitForTimeout(300);
    const freshSync = (await state(p)).patch.blocks.find(
      (b: any) =>
        b.type === 'power.emitter' &&
        b.id !== patch.blocks.find((x: any) => x.type === 'power.emitter').id,
    )?.params?.sync;
    await p.evaluate(() => (window as any).__bd_probe.scene.host.createBlock('StereoDelay', 8, -8));
    await p.mouse.up();
    await p.waitForTimeout(300);
    const freshDelay = (await state(p)).patch.blocks
      .filter((b: any) => b.type === 'fx.stereo-delay')
      .map((b: any) => b.params?.sync);
    await p.close();
    const by = (t: string) => patch.blocks.find((b: any) => b.type === t).params;
    const em = by('power.emitter'),
      pu = by('power.pulse'),
      la = by('power.laser'),
      de = by('fx.stereo-delay');
    const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    const ok =
      eq(emitterOff, ['Angle', 'Tempo Sync', 'Fire Rate', 'Offset', 'P. Speed', 'Range']) &&
      eq(emitterOn, ['Angle', 'Tempo Sync', 'Division', 'Swing', 'Offset', 'Range']); // Offset: CHG-0014 &&
    eq(pulseOff, ['Tempo Sync', 'Pulse length', 'Delay', 'Pulse On']) &&
      eq(pulseOn, ['Tempo Sync', 'Length', 'Delay', 'Pulse On']); // Delay: CHG-0029 &&
    eq(laserOff, ['Angle', 'Tempo Sync', 'Rotate', 'Range']) &&
      eq(laserOn, ['Angle', 'Tempo Sync', 'Turn', 'Range']) &&
      eq(delayOff, ['Tempo Sync', 'Delay Time', 'Feedback', 'Mix']) &&
      eq(delayOn, ['Tempo Sync', 'Delay', 'Feedback', 'Mix']) &&
      de.sync === 1 &&
      de.delayBeats === 0.75 &&
      eq(freshDelay.slice(1), [true]) &&
      em.sync === 1 &&
      Math.abs(em.division - 1 / 3) < 1e-9 &&
      em.swing === 0.5 &&
      pu.sync === 1 &&
      pu.pulseBeats === 1 &&
      la.sync === 1 &&
      la.turnBeats === -8 &&
      patch.tempo === 90 &&
      fresh != null &&
      (freshSync === true || freshSync === 1);
    return [
      ok,
      {
        emitterOff,
        emitterOn,
        pulseOff,
        pulseOn,
        laserOff,
        laserOn,
        emitter: { sync: em.sync, division: em.division, swing: em.swing },
        pulse: { sync: pu.sync, pulseBeats: pu.pulseBeats },
        laser: { sync: la.sync, turnBeats: la.turnBeats },
        delayOff,
        delayOn,
        delay: { sync: de.sync, delayBeats: de.delayBeats },
        freshDelay,
        tempo: patch.tempo,
        freshSync,
      },
    ];
  },
  /** Audio Input (plugin label of v1's Microphone) and Audio In have one Gain row (dB, −40 = off, up to +6); v1's
   * Microphone had no options. The param is a ratio (1 = unity, a true bypass in the plugins). */
  async 'input-gain-option'(errors: string[]) {
    const { pg, close } = await openPlugin(
      plugPatch([
        { id: 'in', type: 'source.audio-in', x: 0, y: 0 },
        { id: 'mic', type: 'source.microphone', x: 8, y: 0 },
      ]),
      errors,
    );
    const out: Record<string, unknown> = {};
    for (const type of ['source.audio-in', 'source.microphone']) {
      const id = (await state(pg)).blocks.find((b: any) => b.type === type).id;
      const pt = await pg.evaluate((i) => (window as any).__bd_probe.blockPoint(i), id);
      await pg.mouse.click(pt[0], pt[1]);
      await pg.waitForTimeout(1000);
      const panel = await pg.evaluate(() => {
        const optionsPanel = (window as any).__bd_probe.scene.OptionsPanel;
        return {
          open: optionsPanel.Scale > 0,
          name: optionsPanel.Name ?? optionsPanel.SelectedBlock?.OptionsForm?.name,
          rows: optionsPanel.Options.map((Option: any) => Option.Name),
        };
      });
      await pg.evaluate(() =>
        (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('gainDb', -6),
      );
      await pg.waitForTimeout(200);
      const gain = (await state(pg)).patch.blocks.find((b: any) => b.type === type).params.gain;
      const sentGain = await pg.evaluate(
        ([i]) =>
          (window as any).__sent
            .filter((x: any) => x.id === 'bd_commands')
            .flatMap((x: any) => x.v.commands)
            .some((c: any) => c.id === i && c.param === 0 && Math.abs(c.value - 0.501) < 0.001),
        [id],
      );
      out[type] = { ...panel, gain, sentGain };
      await pg.mouse.click(1100, 700);
      await pg.waitForTimeout(600);
    }
    await close();
    const ok = Object.values(out).every(
      (o: any) =>
        o.open &&
        o.rows.length === 1 &&
        o.rows[0] === 'Gain' &&
        Math.abs(o.gain - 0.501) < 0.001 &&
        o.sentGain,
    );
    return [ok, out];
  },
  /** CHG-0010 (owner, 2026-11-12, "option B"): the Filter's panel is the EQ's graph with one handle and a TYPE row
   * (Peak, Low pass, High pass, Band pass). Choosing Low pass and dragging the handle to the left darkens a powered
   * Tone; the graph falls towards 20 kHz; the width bar shows for Peak and Band pass only. */
  async 'filter-types'(errors: string[]) {
    const p = await open(
      browser,
      [blk(1, 'ToneSource', 0, 0), blk(2, 'Power', -3, 0), blk(3, 'Filter', 3, -1)],
      errors,
    );
    const [fx, fy] = await toCss(p, 3, -1);
    await p.mouse.click(fx, fy);
    await p.waitForTimeout(1500);
    const panel = () =>
      p.evaluate(() => {
        const optionsPanel = (window as any).__bd_probe.scene.OptionsPanel,
          pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio;
        const g = optionsPanel.Options.find((x: any) => x.Type === 'parametric'),
          t = optionsPanel.Options.find((x: any) => x.Type === 'buttons');
        const h = g?.Handles[1];
        return {
          types: optionsPanel.Options.map((x: any) => x.Type),
          params: { ...optionsPanel.SelectedBlock?.Params },
          buttons: t?.Buttons.map((b: any) => [
            (optionsPanel.Position.x + optionsPanel.Margin + b.Position.x + b.Size.width / 2) / pr,
            (optionsPanel.Position.y + t.Position.y + t.Size.height / 2) / pr,
          ]),
          handle: h && [
            (optionsPanel.Position.x + optionsPanel.Margin + h.Position.x) / pr,
            (optionsPanel.Position.y + g.Position.y + g.Size.height * 0.8 - h.Position.y) / pr,
          ],
          graphLeft: (optionsPanel.Position.x + optionsPanel.Margin) / pr,
          curve: g ? [g.LineGain[0], g.LineGain[g.Smoothness - 1]] : null,
          bar: g ? g.SubHandles[1].Draw.toString().length > 10 : null,
        };
      });
    const peak = await panel();
    const before = await maxOver(p, 'rms', 600);
    await p.mouse.click(peak.buttons[1][0], peak.buttons[1][1]);
    await p.waitForTimeout(300);
    const lp = await panel();
    await p.mouse.move(lp.handle[0], lp.handle[1]);
    await p.mouse.down();
    await p.mouse.move(lp.graphLeft + 15, lp.handle[1], { steps: 8 });
    await p.mouse.up();
    await p.waitForTimeout(800);
    const dark = await panel(),
      after = await maxOver(p, 'rms', 600);
    await p.mouse.click(peak.buttons[3][0], peak.buttons[3][1]);
    await p.waitForTimeout(300);
    const bp = await panel();
    await p.screenshot({ path: `${OUT}/filter-types.png` });
    await p.close();
    const r = {
      types: peak.types,
      peakBar: peak.bar,
      lp: { type: lp.params.type, bar: lp.bar },
      freq: dark.params.frequency,
      curve: dark.curve,
      before,
      after,
      bp: { type: bp.params.type, bar: bp.bar },
    };
    const ok =
      JSON.stringify(peak.types) === JSON.stringify(['parametric', 'buttons']) &&
      peak.bar === true &&
      lp.params.type === 1 &&
      lp.bar === false &&
      dark.params.frequency < 60 &&
      dark.curve![1] < dark.curve![0] &&
      after < before * 0.2 &&
      bp.params.type === 3 &&
      bp.bar === true;
    return [ok, r];
  },
  /** SPEC-CONNECTIONS-PROXIMITY R4a (owner, 2026-11-12): a source's effects run in the order they connected, as in
   * v1. Bit Crusher in first, then Stereo Delay: tone → crusher → delay. Crusher out: tone → delay. Crusher back in:
   * tone → delay → crusher. The patch saves that order (`connectionOrder`), and reopening it keeps it. */
  async 'effect-order'(errors: string[]) {
    const p = await open(
      browser,
      [blk(1, 'ToneSource', 0, 0), blk(2, 'BitCrusher', 14, -8), blk(3, 'StereoDelay', -14, -8)],
      errors,
    );
    const dragTo = async (gx: number, gy: number, tx: number, ty: number) => {
      const [x, y] = await toCss(p, gx, gy),
        [x2, y2] = await toCss(p, tx, ty);
      await p.mouse.move(x, y);
      await p.mouse.down();
      await p.mouse.move(x2, y2, { steps: 8 });
      await p.mouse.up();
      await p.waitForTimeout(400);
    };
    const order = async () => {
      const s = await p.evaluate(() => {
        const st = (window as any).__bd_probe.state;
        return {
          order: st.patch.connectionOrder ?? [],
          types: Object.fromEntries(st.patch.blocks.map((b: any) => [b.id, b.type])),
        };
      });
      return (s.order as [string, string][]).map((pr) =>
        pr.map((id) => s.types[id].replace(/^(source|fx)\./, '')).join('+'),
      );
    };
    await dragTo(14, -8, 3, 0); // crusher in
    await dragTo(-14, -8, -3, 0); // then delay
    const first = await order();
    await dragTo(3, 0, 14, 10); // crusher out
    const out = await order();
    await dragTo(14, 10, 3, 0); // and back
    const back = await order();
    const saved = await p.evaluate(() => (window as any).__bd_probe.state.patch);
    await p.close();
    // Reopen the saved patch in a new visit (the autosave): the engine replays the order.
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript((pt) => {
      localStorage.setItem('blokdust2.autosave', pt);
    }, JSON.stringify(saved));
    const q = await ctx.newPage();
    q.on('pageerror', (e) => errors.push(e.message));
    await q.goto(`${url}/index.html`);
    await q.waitForFunction(() => (window as any).__bd_probe);
    await q.click('#start');
    await q.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
    await q.waitForTimeout(500);
    const reopened = await q.evaluate(() => (window as any).__bd_probe.state.patch.connectionOrder); // from the engine's snapshots
    await ctx.close();
    const ok =
      JSON.stringify(first) === JSON.stringify(['tone+bit-crusher', 'tone+stereo-delay']) &&
      JSON.stringify(out) === JSON.stringify(['tone+stereo-delay']) &&
      JSON.stringify(back) === JSON.stringify(['tone+stereo-delay', 'tone+bit-crusher']) &&
      JSON.stringify(reopened) === JSON.stringify(saved.connectionOrder);
    return [ok, { first, out, back, saved: saved.connectionOrder, reopened }];
  },
};
