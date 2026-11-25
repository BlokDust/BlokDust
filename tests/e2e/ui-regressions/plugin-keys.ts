// ui-regressions: The plugins' keyboard and labels.
import { OUT, blk, browser, open, type RegressionTest, url } from './harness.ts';
import { type Page } from 'playwright';
import { openPlugin, plugPatch } from './pluginPage.ts';
import type { CommandsMessage } from '../pageGlobals.ts';
import type { V1BlockView } from './v1Views.ts';

export const pluginKeysTests: Record<string, RegressionTest> = {
  /** Plugin: with a Computer Keyboard in the patch, its note keys are BlokDust's, not the DAW's;
   * without one, keys go on to the DAW (e.g. Logic's Musical Typing for a MIDI Input). */
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
  /** CHG-0013: the page keeps note-key repeats, and in the standalone app every plain key outside a
   * text field (no macOS beep); Cmd/Ctrl reach the menus, and in a DAW unused keys reach it. */
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
        ([keyCode, keyName, modifiers]) => {
          const event = new KeyboardEvent('keydown', {
            code: keyCode,
            key: keyName,
            bubbles: true,
            cancelable: true,
            ...modifiers,
          });
          document.body.dispatchEvent(event);
          document.body.dispatchEvent(
            new KeyboardEvent('keyup', {
              code: keyCode,
              key: keyName,
              bubbles: true,
              cancelable: true,
            }),
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
  /** A key held while clicking into the DAW left its note stuck (no key-up, no blur): the editor
   * says when its window loses the keys (bd_keysLost) and the page ends every held note. */
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
    await pg.evaluate(() => {
      window.__fire?.('bd_keysLost', {});
    });
    await pg.waitForTimeout(200);
    const notes = await pg.evaluate(() =>
      (window.__sent ?? [])
        .filter((message) => message.id === 'bd_commands')
        .flatMap((message) => (message.v as CommandsMessage).commands)
        .filter((command) => command.type === 4 || command.type === 5)
        .map((command) => `${command.type === 4 ? 'on' : 'off'}:${command.param ?? ''}`),
    );
    await pg.keyboard.up('KeyZ');
    await pg.waitForTimeout(100);
    await close();
    return [notes.length === 2 && notes[0] === 'on:48' && notes[1] === 'off:48', { notes }];
  },
  /** CHG-0004: the plugin names Microphone "Audio Input" and MIDI Controller "MIDI Input", with no
   * Device option (the DAW track picks it); the website keeps v1's names. */
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
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript((processorPatch) => {
      const listeners: Partial<Record<string, ((value: unknown) => void)[]>> = {};
      window.__JUCE__ = {
        backend: {
          addEventListener: (id: string, listener: (value: unknown) => void) => {
            (listeners[id] ??= []).push(listener);
          },
          emitEvent: (id: string) => {
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
    if (!midi) throw new Error('no MIDI Input on the stage');
    const point = await pg.evaluate((i) => window.__bd_probe.blockPoint(i), midi.id);
    if (!point) throw new Error('the MIDI Input is not on screen');
    await pg.mouse.click(point[0], point[1]);
    await pg.waitForTimeout(1200);
    const panel = await pg.evaluate(() => {
      const optionsPanel = window.__bd_probe.scene.OptionsPanel;
      return {
        title: (optionsPanel.SelectedBlock as V1BlockView | undefined)?.OptionsForm?.name as
          string | undefined,
        rows: optionsPanel.Options.map((x) => x.Name),
      };
    });
    await pg.screenshot({ path: `${OUT}/plugin-labels.png` });
    await context.close();
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
