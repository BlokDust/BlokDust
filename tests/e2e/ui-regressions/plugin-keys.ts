// ui-regressions: The plugins' keyboard and labels.
import { OUT, blk, browser, open, type RegressionTest, url } from './harness.ts';
import { type Page } from 'playwright';
import { openPlugin, plugPatch } from './pluginPage.ts';

export const pluginKeysTests: Record<string, RegressionTest> = {
  /** Plugin: with a Computer Keyboard in the patch, its note keys are BlokDust's while the editor has the keys (not
   * passed on to the DAW, whose shortcuts would fire); without one, keys go on to the DAW (e.g. Logic's Musical
   * Typing for a MIDI Input). */
  async 'plugin-keys-capture'(errors: string[]) {
    const probe = (pg: Page) =>
      pg.evaluate(() => {
        const event = new KeyboardEvent('keydown', {
          code: 'KeyZ',
          key: 'z',
          bubbles: true,
          cancelable: true,
        });
        document.body.dispatchEvent(event);
        document.body.dispatchEvent(
          new KeyboardEvent('keyup', { code: 'KeyZ', key: 'z', bubbles: true, cancelable: true }),
        );
        return event.defaultPrevented;
      });
    const a = await openPlugin(
      plugPatch([
        { id: 'k', type: 'input.computer-keyboard', x: -3, y: 0 },
        { id: 't', type: 'source.tone', x: 0, y: 0 },
      ]),
      errors,
    );
    const withKeyboard = await probe(a.pg);
    await a.close();
    const b = await openPlugin(
      plugPatch([
        { id: 'm', type: 'input.midi-controller', x: -3, y: 0 },
        { id: 't', type: 'source.tone', x: 0, y: 0 },
      ]),
      errors,
    );
    const without = await probe(b.pg);
    await b.close();
    return [
      withKeyboard && !without,
      { preventedWithKeyboard: withKeyboard, preventedWithout: without },
    ];
  },
  /** Owner (2026-11-13, CHG-0013): holding a key in the standalone app made macOS's "no one took that key" sound over
   * and over. The web view passes on every key the page doesn't cancel, and the page let key repeats through. Now a
   * note key's repeats are the page's too, and in the standalone app (no DAW to pass keys to) every plain key outside
   * a text field is; Cmd/Ctrl shortcuts still reach the menus. In a DAW, keys BlokDust doesn't use still reach it. */
  async 'plugin-key-repeat-no-beep'(errors: string[]) {
    const press = (
      pg: Page,
      code: string,
      key: string,
      more: {
        repeat?: boolean;
        metaKey?: boolean;
        ctrlKey?: boolean;
        shiftKey?: boolean;
        altKey?: boolean;
      } = {},
    ) =>
      pg.evaluate(
        ([c, k, m]) => {
          const event = new KeyboardEvent('keydown', {
            code: c,
            key: k,
            bubbles: true,
            cancelable: true,
            ...m,
          });
          document.body.dispatchEvent(event);
          document.body.dispatchEvent(
            new KeyboardEvent('keyup', { code: c, key: k, bubbles: true, cancelable: true }),
          );
          return event.defaultPrevented;
        },
        [code, key, more] as const,
      );
    const kb = [
      { id: 'k', type: 'input.computer-keyboard', x: -3, y: 0 },
      { id: 't', type: 'source.tone', x: 0, y: 0 },
    ];
    const daw = await openPlugin(plugPatch(kb), errors);
    const dawRepeat = await press(daw.pg, 'KeyZ', 'z', { repeat: true });
    await daw.close();
    const dawBare = await openPlugin(
      plugPatch([{ id: 't', type: 'source.tone', x: 0, y: 0 }]),
      errors,
    );
    const dawOther = await press(dawBare.pg, 'KeyA', 'a');
    await dawBare.close();
    const app = await openPlugin(
      plugPatch([{ id: 't', type: 'source.tone', x: 0, y: 0 }]),
      errors,
      undefined,
      true,
    );
    const appLetter = await press(app.pg, 'KeyA', 'a'),
      appRepeat = await press(app.pg, 'KeyA', 'a', { repeat: true });
    const appArrow = await press(app.pg, 'ArrowUp', 'ArrowUp', { repeat: true }),
      appCmd = await press(app.pg, 'KeyQ', 'q', { metaKey: true });
    await app.close();
    const result = { dawRepeat, dawOther, appLetter, appRepeat, appArrow, appCmd };
    return [dawRepeat && !dawOther && appLetter && appRepeat && appArrow && !appCmd, result];
  },
  /** Ableton: holding a computer key and clicking into the DAW left the note stuck (the web view never saw the key-up
   * and, in a plugin window, no blur either). The editor tells the page when its window loses the keys (bd_keysLost)
   * and the page ends every held note. */
  async 'plugin-keys-lost'(errors: string[]) {
    const { pg, close } = await openPlugin(
      plugPatch([
        { id: 'k', type: 'input.computer-keyboard', x: -3, y: 0 },
        { id: 't', type: 'source.tone', x: 0, y: 0 },
      ]),
      errors,
    );
    await pg.mouse.click(1100, 700);
    await pg.waitForTimeout(300);
    await pg.keyboard.down('KeyZ');
    await pg.waitForTimeout(200);
    await pg.evaluate(() => window.__fire('bd_keysLost', {}));
    await pg.waitForTimeout(200);
    const notes = await pg.evaluate(() =>
      window.__sent
        .filter((x) => x.id === 'bd_commands')
        .flatMap((x) => x.v.commands)
        .filter((c) => c.type === 4 || c.type === 5)
        .map((c) => `${c.type === 4 ? 'on' : 'off'}:${c.param}`),
    );
    await pg.keyboard.up('KeyZ');
    await pg.waitForTimeout(100);
    await close();
    return [notes.length === 2 && notes[0] === 'on:48' && notes[1] === 'off:48', { notes }];
  },
  /** CHG-0004 3.3 (owner): inside the plugin, Microphone shows as "Audio Input" and MIDI Controller as "MIDI Input"
   * (menus, block names, panel titles); the MIDI Input has no Device option there (the DAW track picks it). The website
   * keeps v1's names. The plugin is simulated with a fake JUCE backend that sends the patch, as the processor does. */
  async 'plugin-labels'(errors: string[]) {
    const patch = {
      format: 'blokdust.patch',
      version: 2,
      seed: 1,
      blocks: [
        { id: 'mic', type: 'source.microphone', x: -3, y: 0, params: {} },
        { id: 'midi', type: 'input.midi-controller', x: 3, y: 0, params: {} },
      ],
    };
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript((p) => {
      const listeners: Record<string, ((x: unknown) => void)[]> = {};
      window.__JUCE__ = {
        backend: {
          addEventListener: (id: string, fn: (x: unknown) => void) => {
            (listeners[id] ??= []).push(fn);
          },
          emitEvent: (id: string) => {
            if (id === 'bd_hello')
              setTimeout(() => {
                listeners.bd_patch?.forEach((listener) => {
                  listener({ patch: JSON.stringify(p) });
                });
              }, 50);
          },
        },
      };
    }, patch);
    const pg = await ctx.newPage();
    pg.on('pageerror', (error) => errors.push(error.message));
    await pg.goto(`${url}/index.html`);
    await pg.waitForFunction(() => window.__bd_probe?.state.started, null, {
      timeout: 15000,
    });
    await pg.waitForTimeout(1500);
    const menu = await pg.evaluate(() =>
      window.__bd_probe.v1App.BlockCreator.MenuJson.categories.flatMap((category) =>
        category.items.map((i) => i.name),
      ),
    );
    const names = await pg.evaluate(() =>
      [...window.__bd_probe.v1App.Blocks].map((b) => b.BlockName),
    );
    const midi = (await pg.evaluate(() => window.__bd_probe.state.blocks)).find(
      (b) => b.type === 'input.midi-controller',
    );
    const pt = await pg.evaluate((i) => window.__bd_probe.blockPoint(i), midi.id);
    await pg.mouse.click(pt[0], pt[1]);
    await pg.waitForTimeout(1200);
    const panel = await pg.evaluate(() => {
      const optionsPanel = window.__bd_probe.scene.OptionsPanel;
      return {
        title: optionsPanel.SelectedBlock?.OptionsForm?.name,
        rows: optionsPanel.Options.map((x) => x.Name),
      };
    });
    await pg.screenshot({ path: `${OUT}/plugin-labels.png` });
    await ctx.close();
    const web = await open(browser, [blk(1, 'Microphone', 0, 0)], errors);
    const webMenu = await web.evaluate(() =>
      window.__bd_probe.v1App.BlockCreator.MenuJson.categories.flatMap((category) =>
        category.items.map((i) => i.name),
      ),
    );
    await web.close();
    const ok =
      menu.includes('Audio Input') &&
      menu.includes('MIDI Input') &&
      !menu.includes('Microphone') &&
      names.includes('Audio Input') &&
      names.includes('MIDI Input') &&
      panel.title === 'MIDI Input' &&
      !panel.rows.includes('Device') &&
      panel.rows.includes('Channel') &&
      webMenu.includes('Microphone') &&
      webMenu.includes('MIDI Controller');
    return [
      ok,
      {
        plugin: { names, title: panel.title, rows: panel.rows },
        webMenuKeepsV1: webMenu.includes('Microphone') && webMenu.includes('MIDI Controller'),
      },
    ];
  },
};
