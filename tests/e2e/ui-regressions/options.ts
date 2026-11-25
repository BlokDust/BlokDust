// ui-regressions: Block options panels: tempo sync, input gain, filter types and effect order.
import {
  OUT,
  blk,
  blockAt,
  browser,
  maxOver,
  open,
  state,
  toCss,
  type RegressionTest,
  url,
} from './harness.ts';
import { openPlugin, plugPatch } from './pluginPage.ts';
import type { CommandsMessage } from '../pageGlobals.ts';
import type { V1BlockView } from './v1Views.ts';

export const optionsTests: Record<string, RegressionTest> = {
  /** CHG-0004: Tempo Sync on Emitter, Pulse, Laser and Stereo Delay swaps their timing rows for
   * musical steps; the patch saves tempo and synced params; new ones from the menu start synced. */
  async 'tempo-sync-options'(errors: string[]) {
    const page = await open(
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
      page.evaluate(() =>
        window.__bd_probe.scene.OptionsPanel.Options.map((row) =>
          row.Type === 'switches'
            ? (row.Switches ?? []).map((toggle) => toggle.Name).join('+')
            : row.Name,
        ),
      );
    const rows = async (type: string) => {
      const block = (await state(page)).blocks.find((b) => b.type === type);
      if (!block) throw new Error(`no ${type}`);
      const [x, y] = await blockAt(page, block.id);
      await page.mouse.click(x, y);
      await page.waitForTimeout(1000);
      return names();
    };
    const set = (param: string, value: number | boolean) =>
      page.evaluate(
        ([key, val]) => {
          (window.__bd_probe.scene.OptionsPanel.SelectedBlock as V1BlockView).SetParam(key, val);
        },
        [param, value] as const,
      );
    const close = async () => {
      await page.mouse.click(1100, 700);
      await page.waitForTimeout(600);
    };
    const emitterOff = await rows('power.emitter');
    await set('sync', true);
    await set('divisionIndex', 4);
    await set('swing', 0.5);
    // Settings › Tempo (settings-release1)
    await page.evaluate(() => {
      window.__bd_probe.scene.host.setTempo(90);
    });
    await page.waitForTimeout(200);
    const emitterOn = await names();
    await page.mouse.move(700, 300);
    await page.mouse.move(705, 305);
    await page.waitForTimeout(300); // the stage redraws on input
    await page.screenshot({ path: `${OUT}/tempo-sync-emitter.png` });
    await close();
    const pulseOff = await rows('power.pulse');
    await set('sync', true);
    await set('lengthIndex', 7);
    await page.waitForTimeout(200);
    const pulseOn = await names();
    await close();
    const laserOff = await rows('power.laser');
    await set('sync', true);
    await page.waitForTimeout(200);
    await set('turnIndex', 5);
    await page.waitForTimeout(200);
    const laserOn = await names();
    await page.mouse.move(700, 300);
    await page.mouse.move(705, 305);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/tempo-sync-laser.png` });
    await close();
    const delayOff = await rows('fx.stereo-delay');
    await set('sync', true);
    await page.waitForTimeout(200);
    await set('delayIndex', 7);
    await page.waitForTimeout(200);
    const delayOn = await names();
    await page.mouse.move(700, 300);
    await page.mouse.move(705, 305);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/tempo-sync-delay.png` });
    await close();
    const patch = (await state(page)).patch;
    // A new Emitter from the menu starts synced.
    const fresh = await page.evaluate(() => {
      const scene = window.__bd_probe.scene;
      const id = scene.host.createBlock('ParticleEmitter', 0, -8);
      return id;
    });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const firstEmitter = patch.blocks.find((x) => x.type === 'power.emitter')?.id;
    const freshSync = (await state(page)).patch.blocks.find(
      (b) => b.type === 'power.emitter' && b.id !== firstEmitter,
    )?.params?.sync;
    await page.evaluate(() => {
      window.__bd_probe.scene.host.createBlock('StereoDelay', 8, -8);
    });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const freshDelay = (await state(page)).patch.blocks
      .filter((b) => b.type === 'fx.stereo-delay')
      .map((b) => b.params?.sync);
    await page.close();
    const by = (type: string) => patch.blocks.find((b) => b.type === type)?.params ?? {};
    const em = by('power.emitter'),
      pu = by('power.pulse'),
      la = by('power.laser'),
      de = by('fx.stereo-delay');
    const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    // Offset: CHG-0014; the Pulse's Delay: CHG-0029; the Laser's Restart: CHG-0034.
    const ok =
      eq(emitterOff, ['Angle', 'Tempo Sync', 'Fire Rate', 'Offset', 'P. Speed', 'Range']) &&
      eq(emitterOn, ['Angle', 'Tempo Sync', 'Division', 'Swing', 'Offset', 'Range']) &&
      eq(pulseOff, ['Tempo Sync', 'Pulse length', 'Delay', 'Pulse On']) &&
      eq(pulseOn, ['Tempo Sync', 'Length', 'Delay', 'Pulse On']) &&
      eq(laserOff, ['Angle', 'Tempo Sync+Restart', 'Rotate', 'Range']) &&
      eq(laserOn, ['Angle', 'Tempo Sync+Restart', 'Turn', 'Range']) &&
      eq(delayOff, ['Tempo Sync', 'Delay Time', 'Feedback', 'Mix']) &&
      eq(delayOn, ['Tempo Sync', 'Delay', 'Feedback', 'Mix']) &&
      de.sync === 1 &&
      de.delayBeats === 0.75 &&
      eq(freshDelay.slice(1), [true]) &&
      em.sync === 1 &&
      Math.abs(Number(em.division) - 1 / 3) < 1e-9 &&
      em.swing === 0.5 &&
      pu.sync === 1 &&
      pu.pulseBeats === 1 &&
      la.sync === 1 &&
      la.turnBeats === -8 &&
      patch.tempo === 90 &&
      fresh !== null &&
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
  /** Audio Input and Audio In have one Gain row (dB, −40 off, up to +6; v1 had none); the param is
   * a ratio (1 = unity, a true bypass in the plugins). */
  async 'input-gain-option'(errors: string[]) {
    const { pg, close } = await openPlugin(
      plugPatch([
        { id: 'in', type: 'source.audio-in', x: 0, y: 0 },
        { id: 'mic', type: 'source.microphone', x: 8, y: 0 },
      ]),
      errors,
    );
    const out: Record<
      string,
      { open: boolean; name?: string; rows: string[]; gain: unknown; sentGain: boolean }
    > = {};
    for (const type of ['source.audio-in', 'source.microphone']) {
      const block = (await state(pg)).blocks.find((b) => b.type === type);
      if (!block) throw new Error(`no ${type}`);
      const id = block.id;
      const [x, y] = await blockAt(pg, id);
      await pg.mouse.click(x, y);
      await pg.waitForTimeout(1000);
      const panel = await pg.evaluate(() => {
        const optionsPanel = window.__bd_probe.scene.OptionsPanel;
        return {
          open: optionsPanel.Scale > 0,
          name: (optionsPanel.SelectedBlock as V1BlockView | undefined)?.OptionsForm?.name,
          rows: optionsPanel.Options.map((row) => row.Name),
        };
      });
      await pg.evaluate(() => {
        (window.__bd_probe.scene.OptionsPanel.SelectedBlock as V1BlockView).SetParam('gainDb', -6);
      });
      await pg.waitForTimeout(200);
      const gain = (await state(pg)).patch.blocks.find((b) => b.type === type)?.params?.gain;
      const sentGain = await pg.evaluate(
        ([i]) =>
          (window.__sent ?? [])
            .filter((x) => x.id === 'bd_commands')
            .flatMap((x) => (x.v as CommandsMessage).commands)
            .some(
              (command) =>
                command.id === i &&
                command.param === 0 &&
                Math.abs((command.value ?? NaN) - 0.501) < 0.001,
            ),
        [id],
      );
      out[type] = { ...panel, gain, sentGain };
      await pg.mouse.click(1100, 700);
      await pg.waitForTimeout(600);
    }
    await close();
    const ok = Object.values(out).every(
      (row) =>
        row.open &&
        row.rows.length === 1 &&
        row.rows[0] === 'Gain' &&
        Math.abs(Number(row.gain) - 0.501) < 0.001 &&
        row.sentGain,
    );
    return [ok, out];
  },
  /** CHG-0010: the Filter's panel is a one-handle graph and a TYPE row; Low pass with the handle
   * dragged left darkens a Tone, and the width bar shows for Peak and Band pass only. */
  async 'filter-types'(errors: string[]) {
    const page = await open(
      browser,
      [blk(1, 'ToneSource', 0, 0), blk(2, 'Power', -3, 0), blk(3, 'Filter', 3, -1)],
      errors,
    );
    const [fx, fy] = await toCss(page, 3, -1);
    await page.mouse.click(fx, fy);
    await page.waitForTimeout(1500);
    const panel = () =>
      page.evaluate(() => {
        const optionsPanel = window.__bd_probe.scene.OptionsPanel,
          pr = window.__bd_probe.v1App.Metrics.PixelRatio;
        const option = optionsPanel.Options.find((x) => x.Type === 'parametric'),
          typeRow = optionsPanel.Options.find((x) => x.Type === 'buttons');
        const optionHandle = option?.Handles[1];
        const params: Record<string, unknown> = {
          ...(optionsPanel.SelectedBlock as V1BlockView | undefined)?.Params,
        };
        const curve = option;
        return {
          types: optionsPanel.Options.map((x) => x.Type),
          params,
          buttons: typeRow?.Buttons.map((b) => [
            (optionsPanel.Position.x + optionsPanel.Margin + b.Position.x + b.Size.width / 2) / pr,
            (optionsPanel.Position.y + typeRow.Position.y + typeRow.Size.height / 2) / pr,
          ]),
          handle: optionHandle && [
            (optionsPanel.Position.x + optionsPanel.Margin + optionHandle.Position.x) / pr,
            (optionsPanel.Position.y +
              option.Position.y +
              option.Size.height * 0.8 -
              optionHandle.Position.y) /
              pr,
          ],
          graphLeft: (optionsPanel.Position.x + optionsPanel.Margin) / pr,
          curve: curve ? [curve.LineGain[0], curve.LineGain[curve.Smoothness - 1]] : null,
          bar: option ? option.SubHandles[1].Draw.toString().length > 10 : null,
        };
      });
    const peak = await panel();
    const typeButtons = peak.buttons ?? [];
    const before = await maxOver(page, 'rms', 600);
    await page.mouse.click(typeButtons[1][0], typeButtons[1][1]);
    await page.waitForTimeout(300);
    const lp = await panel();
    const handle = lp.handle;
    if (!handle) throw new Error('no filter handle');
    await page.mouse.move(handle[0], handle[1]);
    await page.mouse.down();
    await page.mouse.move(lp.graphLeft + 15, handle[1], { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(800);
    const dark = await panel(),
      after = await maxOver(page, 'rms', 600);
    await page.mouse.click(typeButtons[3][0], typeButtons[3][1]);
    await page.waitForTimeout(300);
    const bp = await panel();
    await page.screenshot({ path: `${OUT}/filter-types.png` });
    await page.close();
    const result = {
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
      Number(dark.params.frequency) < 60 &&
      !!dark.curve &&
      dark.curve[1] < dark.curve[0] &&
      after < before * 0.2 &&
      bp.params.type === 3 &&
      bp.bar === true;
    return [ok, result];
  },
  /** SPEC-CONNECTIONS-PROXIMITY R4a: a source's effects run in the order they connected, as in v1;
   * the patch saves that order (`connectionOrder`), and reopening it keeps it. */
  async 'effect-order'(errors: string[]) {
    const page = await open(
      browser,
      [blk(1, 'ToneSource', 0, 0), blk(2, 'BitCrusher', 14, -8), blk(3, 'StereoDelay', -14, -8)],
      errors,
    );
    const dragTo = async (gx: number, gy: number, tx: number, ty: number) => {
      const [x, y] = await toCss(page, gx, gy),
        [x2, y2] = await toCss(page, tx, ty);
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x2, y2, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(400);
    };
    const order = async () => {
      const seen = await page.evaluate(() => {
        const probeState = window.__bd_probe.state;
        return {
          order: probeState.patch.connectionOrder ?? [],
          types: Object.fromEntries(probeState.patch.blocks.map((b) => [b.id, b.type])),
        };
      });
      return seen.order.map((pair) =>
        pair.map((id) => seen.types[id].replace(/^(source|fx)\./, '')).join('+'),
      );
    };
    await dragTo(14, -8, 3, 0); // crusher in
    await dragTo(-14, -8, -3, 0); // then delay
    const first = await order();
    await dragTo(3, 0, 14, 10); // crusher out
    const out = await order();
    await dragTo(14, 10, 3, 0); // and back
    const back = await order();
    const saved = await page.evaluate(() => window.__bd_probe.state.patch);
    await page.close();
    // Reopen the saved patch in a new visit (the autosave): the engine replays the order.
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript((autosave) => {
      localStorage.setItem('blokdust2.autosave', autosave);
    }, JSON.stringify(saved));
    const otherPage = await context.newPage();
    otherPage.on('pageerror', (error) => errors.push(error.message));
    await otherPage.goto(`${url}/index.html`);
    await otherPage.waitForFunction(() => window.__bd_probe);
    await otherPage.click('#start');
    await otherPage.waitForFunction(() => window.__bd_probe.state.snapshots > 10);
    await otherPage.waitForTimeout(500);
    // From the engine's snapshots.
    const reopened = await otherPage.evaluate(() => window.__bd_probe.state.patch.connectionOrder);
    await context.close();
    const ok =
      JSON.stringify(first) === JSON.stringify(['tone+bit-crusher', 'tone+stereo-delay']) &&
      JSON.stringify(out) === JSON.stringify(['tone+stereo-delay']) &&
      JSON.stringify(back) === JSON.stringify(['tone+stereo-delay', 'tone+bit-crusher']) &&
      JSON.stringify(reopened) === JSON.stringify(saved.connectionOrder);
    return [ok, { first, out, back, saved: saved.connectionOrder, reopened }];
  },
};
