// ui-regressions: Dust: its menu, the filter and the sliders it moves.
import { OUT, blockAt, browser, state, type RegressionTest, url } from './harness.ts';

/** What the page sends the processor for Dust: bd_automation and bd_learnCC. */
interface DustMessage {
  slot?: number;
  id?: number;
  param?: string;
}
import { openPlugin } from './pluginPage.ts';

export const dustTests: Record<string, RegressionTest> = {
  /** PLUGIN-0003, CHG-0004: right-clicking a plugin slider opens the Dust menu: DUST n assigns it,
   * LEARN MIDI CC asks the processor to bind the next CC, and a learned CC shows. */
  async 'dust-menu'(errors: string[]) {
    // A block with sliders (the Filter's became a graph in CHG-0010: filter-dust).
    const patch = {
      format: 'blokdust.patch',
      version: 2,
      seed: 1,
      blocks: [{ id: 'f', type: 'fx.distortion', x: 0, y: 0, params: {} }],
    };
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript((processorPatch) => {
      const listeners: Partial<Record<string, ((value: unknown) => void)[]>> = {};
      const sent: { id: string; v: unknown }[] = [];
      window.__sent = sent;
      window.__fire = (id: string, value: unknown) => {
        listeners[id]?.forEach((listener) => {
          listener(value);
        });
      };
      window.__JUCE__ = {
        backend: {
          addEventListener: (id: string, listener: (value: unknown) => void) => {
            (listeners[id] ??= []).push(listener);
          },
          emitEvent: (id: string, value: unknown) => {
            sent.push({ id, v: value });
            if (id === 'bd_hello')
              setTimeout(() => {
                listeners.bd_patch?.forEach((listener) => {
                  listener({ patch: JSON.stringify(processorPatch) });
                });
              }, 50);
          },
        },
      };
    }, patch);
    const pg = await context.newPage();
    pg.on('pageerror', (error) => errors.push(error.message));
    await pg.goto(`${url}/index.html`);
    await pg.waitForFunction(() => (window as Partial<Window>).__bd_probe?.state.started, null, {
      timeout: 15000,
    });
    await pg.waitForTimeout(800);
    const id = (await state(pg)).blocks[0].id;
    const [bx, by] = await blockAt(pg, id);
    await pg.mouse.click(bx, by);
    await pg.waitForTimeout(1200);
    // The first slider's track, right-clicked (css px from the panel's own geometry).
    const [sx, sy] = await pg.evaluate(() => {
      const optionsPanel = window.__bd_probe.scene.OptionsPanel,
        sl = optionsPanel.Options.find((Option) => Option.Type === 'slider'),
        pr = devicePixelRatio;
      if (!sl) throw new Error('no slider in the panel');
      return [
        (optionsPanel.Position.x + optionsPanel.Margin + optionsPanel.Range * 0.5) / pr,
        (optionsPanel.Position.y + sl.Position.y + sl.Size.height * 0.5) / pr,
      ];
    });
    const openMenu = async () => {
      await pg.mouse.click(sx, sy, { button: 'right' });
      await pg.waitForSelector('#dust-menu', { timeout: 3000 });
    };
    await openMenu();
    const items = await pg.$$eval('#dust-menu div', (rows) => rows.map((x) => x.textContent));
    await pg.click('#dust-menu div:text("DUST 3")');
    const assigned = await pg.evaluate(
      () =>
        (window.__sent ?? []).filter((x) => x.id === 'bd_automation').pop()?.v as
          DustMessage | undefined,
    );
    await openMenu();
    const learnLabel = await pg.textContent('#dust-menu [data-learn]');
    await pg.click('#dust-menu [data-learn]');
    const learn = await pg.evaluate(
      () =>
        (window.__sent ?? []).filter((x) => x.id === 'bd_learnCC').pop()?.v as
          DustMessage | undefined,
    );
    await pg.waitForTimeout(1000);
    await pg.evaluate(() => {
      window.__fire?.('bd_ccLearned', { slot: 3, cc: 21 });
    });
    await openMenu();
    const learnedLabel = await pg.textContent('#dust-menu [data-learn]');
    await pg.screenshot({ path: `${OUT}/dust-menu.png` });
    await context.close();
    const ok =
      items.length >= 10 &&
      assigned?.slot === 3 &&
      assigned.id === id &&
      typeof assigned.param === 'string' &&
      learnLabel === 'LEARN MIDI CC' &&
      learn?.slot === 3 &&
      learnedLabel === 'CC 21 · LEARN AGAIN';
    return [ok, { items: items.slice(0, 3), assigned, learnLabel, learn, learnedLabel }];
  },
  /** CHG-0010: the Filter's graph takes the Dust menu: right-click the graph for Frequency, the
   * handle for Gain, the width bar for Width (the title names it). */
  async 'filter-dust'(errors: string[]) {
    const patch = {
      format: 'blokdust.patch',
      version: 2,
      seed: 1,
      blocks: [{ id: 'f', type: 'fx.filter', x: 0, y: 0, params: {} }],
    };
    const { pg, close } = await openPlugin(patch, errors);
    await pg.waitForFunction(() => (window as Partial<Window>).__bd_probe?.state.started, null, {
      timeout: 15000,
    });
    await pg.waitForTimeout(800);
    const id = (await state(pg)).blocks[0].id;
    const [bx, by] = await blockAt(pg, id);
    await pg.mouse.click(bx, by);
    await pg.waitForTimeout(1200);
    const spots = await pg.evaluate(() => {
      const optionsPanel = window.__bd_probe.scene.OptionsPanel,
        option = optionsPanel.Options.find((Option) => Option.Type === 'parametric'),
        pr = devicePixelRatio;
      if (!option) throw new Error('no filter graph in the panel');
      const hx = optionsPanel.Position.x + optionsPanel.Margin + option.Handles[1].Position.x,
        top = optionsPanel.Position.y + option.Position.y;
      return {
        graph: [
          (optionsPanel.Position.x + optionsPanel.Margin + optionsPanel.Range * 0.15) / pr,
          (top + option.Size.height * 0.3) / pr,
        ],
        handle: [hx / pr, (top + option.Size.height * 0.8 - option.Handles[1].Position.y) / pr],
        bar: [
          (hx + option.SubHandles[1].Position.x * 0.5) / pr,
          (top + option.Size.height * 0.9) / pr,
        ],
      };
    });
    const result: Record<string, unknown> = {};
    for (const [k, [x, y]] of Object.entries(spots)) {
      await pg.mouse.move(x, y);
      await pg.waitForTimeout(100);
      await pg.mouse.click(x, y, { button: 'right' });
      await pg.waitForSelector('#dust-menu', { timeout: 3000 });
      const title = await pg.textContent('#dust-menu div');
      await pg.click('#dust-menu div:text("DUST 2")');
      result[k] = {
        title,
        param: await pg.evaluate(
          () =>
            (
              (window.__sent ?? []).filter((x) => x.id === 'bd_automation').pop()?.v as
                DustMessage | undefined
            )?.param,
        ),
      };
    }
    await close();
    const ok =
      JSON.stringify(result) ===
      JSON.stringify({
        graph: { title: 'FILTER › FREQUENCY', param: 'frequency' },
        handle: { title: 'FILTER › GAIN', param: 'gain' },
        bar: { title: 'FILTER › WIDTH', param: 'Q' },
      });
    return [ok, result];
  },
  /** A Dust lane moves the plugin slider live with its panel open, and a closed panel opens at the
   * new value: the processor sends bd_paramValues (faked here); the saved patch follows. */
  async 'dust-moves-sliders'(errors: string[]) {
    const patch = {
      format: 'blokdust.patch',
      version: 2,
      seed: 1,
      blocks: [
        { id: 'd', type: 'fx.distortion', x: 0, y: 0, params: {} },
        { id: 'f', type: 'fx.filter', x: -14, y: 4, params: {} },
      ],
    };
    const { pg, close } = await openPlugin(patch, errors);
    await pg.waitForFunction(() => (window as Partial<Window>).__bd_probe?.state.started, null, {
      timeout: 15000,
    });
    await pg.waitForTimeout(800);
    const [key, filterId] = (await state(pg)).blocks.map((b) => b.id);
    const panel = () =>
      pg.evaluate(() => {
        const optionsPanel = window.__bd_probe.scene.OptionsPanel;
        return optionsPanel.Options.map((Option) =>
          Option.Type === 'slider'
            ? [Option.Setting, +Option.Value.toFixed(3)]
            : Option.Type === 'parametric'
              ? ['gain', +Option.Handles[1].YValue.toFixed(3)]
              : [Option.Type],
        );
      });
    const [bx, by] = await blockAt(pg, key);
    await pg.mouse.click(bx, by);
    await pg.waitForTimeout(1200);
    const before = await panel();
    await pg.evaluate(
      ([id]) => {
        window.__fire?.('bd_paramValues', { values: [{ id, param: 'drive', value: 0.9 }] });
      },
      [key],
    );
    await pg.waitForTimeout(200);
    const live = await panel();
    // The Filter's panel is closed while its gain is automated; opened, it shows the new gain.
    await pg.evaluate(
      ([id]) => {
        window.__fire?.('bd_paramValues', { values: [{ id, param: 'gain', value: 17.5 }] });
      },
      [filterId],
    );
    const [fx, fy] = await blockAt(pg, filterId);
    for (
      let i = 0;
      i < 3 &&
      !(await pg.evaluate(() =>
        window.__bd_probe.scene.OptionsPanel.Options.some((Option) => Option.Type === 'parametric'),
      ));
      i++
    ) {
      await pg.mouse.click(fx, fy);
      await pg.waitForTimeout(1200); // a click with another panel open first closes it (v1)
    }
    const filter = await panel();
    const saved = await pg.evaluate(() =>
      window.__bd_probe.state.patch.blocks.map((b) => b.params ?? {}),
    );
    await close();
    const drive = (rows: typeof before) => rows.find((x) => x[0] === 'drive')?.[1];
    const ok =
      drive(before) !== 0.9 &&
      drive(live) === 0.9 &&
      filter.find((x) => x[0] === 'gain')?.[1] === 17.5 &&
      saved[0].drive === 0.9 &&
      saved[1].gain === 17.5;
    return [ok, { before, live, filter, saved }];
  },
};
