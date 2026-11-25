// ui-regressions: The plugins' patches: saving, reopening and quick save in a DAW.
import { OUT, browser, state, toCss, type RegressionTest, url } from './harness.ts';
import { openPlugin, plugPatch } from './pluginPage.ts';
import { openList, openPatches, patchesAt, patchesClick } from './patchesPanel.ts';
import type { CommandsMessage, FakeJuce } from '../pageGlobals.ts';

/** What the page sends the plugin editor about patch files (bd_patch*, bd_openUrl). */
interface PatchFileMessage {
  req?: number;
  patch?: string;
  title?: string;
  mode?: string;
  path?: string;
  url?: string;
}
/** A patch the processor applies, as far as these tests read it. */
interface AppliedPatch {
  blocks: { id: string }[];
}

export const pluginPatchesTests: Record<string, RegressionTest> = {
  /** CHG-0005: plugin patches live in ~/Music/BlokDust/Patches; the page asks the editor
   * (bd_patch*) and the processor merges Open and Insert. Native replies are faked here. */
  async 'plugin-patches'(errors: string[]) {
    const spy = () => {
      const seen: string[] = [];
      const proto = CanvasRenderingContext2D.prototype,
        drawText = Object.getOwnPropertyDescriptor(proto, 'fillText')
          ?.value as typeof proto.fillText;
      proto.fillText = function (text: string, ...rest: [number, number, number?]) {
        seen.push(text);
        drawText.call(this, text, ...rest);
      };
      window.__texts = seen;
      window.__bd_probe.scene.Header.Draw();
    };
    const { pg, close } = await openPlugin(
      plugPatch([{ id: 't', type: 'source.tone', x: 0, y: 0 }]),
      errors,
    );
    const saved = {
      format: 'blokdust.patch',
      version: 2,
      meta: { title: 'My Keys' },
      blocks: [
        { id: 'k', type: 'input.computer-keyboard', x: 0, y: 0 },
        { id: 'o', type: 'source.tone', x: 3, y: 0 },
      ],
    };
    await pg.evaluate((savedPatch) => {
      const backend = (window.__JUCE__ as FakeJuce).backend,
        emit = backend.emitEvent.bind(backend),
        fire = (id: string, value: unknown) => {
          window.__fire?.(id, value);
        };
      backend.emitEvent = (id: string, sent?: unknown) => {
        emit(id, sent);
        const value = sent as { req?: number };
        if (id === 'bd_patchList')
          setTimeout(() => {
            fire('bd_patchList', {
              req: value.req,
              items: [
                {
                  name: 'My Keys',
                  path: '/m/My Keys.blokdust',
                  modified: Date.UTC(2026, 10, 8, 12),
                },
              ],
            });
          }, 20);
        // The user picks a place.
        if (id === 'bd_patchSave')
          setTimeout(() => {
            fire('bd_patchSaved', { req: value.req, ok: true });
          }, 300);
        if (id === 'bd_patchRead')
          setTimeout(() => {
            fire('bd_patchFile', {
              req: value.req,
              text: JSON.stringify(savedPatch),
              name: 'My Keys',
              mode: 'open',
            });
          }, 20);
        if (id === 'bd_patchDelete')
          setTimeout(() => {
            fire('bd_patchDeleted', { req: value.req, ok: true });
          }, 20);
        if (id === 'bd_patchPick')
          setTimeout(() => {
            fire('bd_patchFile', {
              text: JSON.stringify(savedPatch),
              name: 'My Keys',
              file: 'My Keys.blokdust',
              mode: 'choose',
            });
          }, 20);
      };
    }, saved);
    await pg.evaluate(spy);
    await pg.waitForTimeout(300);
    const label = await pg.evaluate(() => ({
      patches: (window.__texts ?? []).includes('PATCHES'),
      share: (window.__texts ?? []).includes('SHARE'),
    }));
    await openPatches(pg);
    const tab = await pg.evaluate(() => window.__bd_probe.scene.PatchesPanel.Tab);
    await patchesClick(pg, 'save', 600);
    const flash = await pg.evaluate(() => window.__bd_probe.scene.PatchesPanel.flashing('save'));
    // CREATE SHARE LINK, after SAVE TO COMPUTER, opens the patch on the site.
    const order = (await patchesAt(pg, 'save'))[0] < (await patchesAt(pg, 'share'))[0];
    await patchesClick(pg, 'share', 400);
    const opened = await pg.evaluate(
      () =>
        (
          (window.__sent ?? []).find((message) => message.id === 'bd_openUrl')?.v as
            PatchFileMessage | undefined
        )?.url,
    );
    await patchesClick(pg, 'tab1', 1100);
    const panel = await pg.evaluate(() => {
      const scene = window.__bd_probe.scene;
      return {
        patches: scene.PatchesPanel.Open,
        share: scene.SharePanel.Open,
        items: scene.PatchesPanel.Items.map((i) => `${i.name} | ${i.detail}`),
      };
    });
    await pg.screenshot({ path: `${OUT}/plugin-patches.png` });
    const sent = () =>
      pg.evaluate(() =>
        (window.__sent ?? [])
          .filter((message) => message.id.startsWith('bd_patch'))
          .map((message) => ({ id: message.id, v: message.v as PatchFileMessage })),
      );
    await patchesClick(pg, 'ins1', 900); // the first preset: Insert (the processor merges it)
    const [bx, by] = await toCss(pg, 0, 0.2),
      [bx2, by2] = await toCss(pg, 4, 0.2); // a change since the save
    await pg.mouse.move(bx, by);
    await pg.mouse.down();
    await pg.mouse.move(bx2, by2, { steps: 6 });
    await pg.mouse.up();
    await pg.waitForTimeout(300);
    await openList(pg);
    await patchesClick(pg, 'open0', 600); // the saved file: Open → asked first
    const asked = await pg.evaluate(() => window.__bd_probe.scene.PatchesPanel.View);
    await patchesClick(pg, 'openAnyway', 900);
    await openList(pg);
    await patchesClick(pg, 'bin0', 400);
    await patchesClick(pg, 'removeOk', 600); // the saved file's bin
    await openList(pg);
    await patchesClick(pg, 'file', 600); // OPEN FROM YOUR DEVICE
    const choice = await pg.evaluate(() => {
      const pp = window.__bd_probe.scene.PatchesPanel;
      return { view: pp.View, picked: pp.Picked };
    });
    await patchesClick(pg, 'fileBack', 400);
    const log = await sent();
    await close();
    const save = log.find((message) => message.id === 'bd_patchSave'),
      apply = log.filter((message) => message.id === 'bd_patchApply');
    const applied = (index: number) => {
      const text = apply.at(index)?.v.patch;
      return text === undefined ? undefined : (JSON.parse(text) as AppliedPatch);
    };
    const ins = applied(0),
      open = applied(1);
    const ok =
      label.patches &&
      !label.share &&
      panel.patches &&
      !panel.share &&
      tab === 0 &&
      panel.items[0] === 'My Keys | Saved 8 Nov 2026' &&
      panel.items.some((item) => item.endsWith('| Preset')) &&
      !!save?.v.title &&
      flash &&
      apply.at(0)?.v.mode === 'insert' &&
      ins?.blocks.length === 6 &&
      !ins.blocks.some((b) => b.id === 't') &&
      asked === 'confirm' &&
      log.some(
        (message) => message.id === 'bd_patchRead' && message.v.path === '/m/My Keys.blokdust',
      ) &&
      apply.at(1)?.v.mode === 'open' &&
      open?.blocks.map((b) => b.id).join() === 'k,o' &&
      choice.view === 'file' &&
      choice.picked?.title === 'My Keys' &&
      choice.picked.fileName === 'My Keys.blokdust' &&
      log.some((message) => message.id === 'bd_patchPick') &&
      order &&
      /^https:\/\/[^?]+\/\?c=p[\w-]+&t=[^&]+&share=1$/.test(opened ?? '') &&
      log.some(
        (message) => message.id === 'bd_patchDelete' && message.v.path === '/m/My Keys.blokdust',
      );
    return [
      ok,
      {
        label,
        tab,
        panel,
        flash,
        asked,
        choice,
        order,
        opened,
        sent: log.map((message) => message.id),
        insertIds: ins?.blocks.map((b) => b.id),
        openIds: open?.blocks.map((b) => b.id),
      },
    ];
  },
  /** The plugin showed an old patch (the web view's autosave) before its own: there the patch comes
   * only from the processor, nothing is drawn before it, and the page never autosaves. */
  async 'plugin-no-stale-patch'(errors: string[]) {
    const stale = {
      format: 'blokdust.patch',
      version: 2,
      seed: 1,
      blocks: [
        { id: 'old', type: 'source.tone', x: 0, y: 0, params: {} },
        { id: 'old2', type: 'fx.reverb', x: 3, y: 0, params: {} },
      ],
    };
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    await context.addInitScript(
      ([old]) => {
        try {
          localStorage.setItem('blokdust2.autosave', JSON.stringify(old));
        } catch {
          /* */
        }
        const listeners: Partial<Record<string, ((value: unknown) => void)[]>> = {};
        const page = window as Partial<Window>;
        page.__seenBeforePatch = 0;
        page.__patched = false;
        const watch = () => {
          if (page.__patched) return;
          page.__seenBeforePatch = Math.max(
            page.__seenBeforePatch ?? 0,
            page.__bd_probe?.state.blocks.length ?? 0,
          );
          requestAnimationFrame(watch);
        };
        requestAnimationFrame(watch);
        page.__JUCE__ = {
          backend: {
            addEventListener: (id: string, listener: (value: unknown) => void) => {
              (listeners[id] ??= []).push(listener);
            },
            emitEvent: (id: string) => {
              if (id === 'bd_hello')
                setTimeout(() => {
                  page.__patched = true;
                  listeners.bd_patch?.forEach((listener) => {
                    listener({
                      patch: JSON.stringify({
                        format: 'blokdust.patch',
                        version: 2,
                        seed: 1,
                        blocks: [],
                      }),
                    });
                  });
                }, 700);
            },
          },
        };
      },
      [stale] as const,
    );
    const pg = await context.newPage();
    pg.on('pageerror', (error) => errors.push(error.message));
    await pg.goto(`${url}/index.html`);
    await pg.waitForFunction(() => (window as Partial<Window>).__bd_probe?.state.started, null, {
      timeout: 15000,
    });
    await pg.waitForTimeout(800);
    const result = await pg.evaluate(() => ({
      seenBeforePatch: window.__seenBeforePatch,
      blocksAfter: window.__bd_probe.state.blocks.length,
      autosave:
        (JSON.parse(localStorage.getItem('blokdust2.autosave') ?? 'null') as AppliedPatch | null)
          ?.blocks.length ?? null,
    }));
    await context.close();
    return [
      result.seenBeforePatch === 0 && result.blocksAfter === 0 && result.autosave === 2,
      result,
    ];
  },
  /** A reopened editor numbered the blocks 1..N though the engine's ids had gaps, so connections
   * and commands named the wrong blocks: the editor sends the engine's ids, which the page uses. */
  async 'plugin-reopen-keeps-ids'(errors: string[]) {
    const patch = plugPatch([
      { id: 'kb', type: 'input.midi-controller', x: 8, y: 0 },
      { id: 'tone', type: 'source.tone', x: 11, y: 0 },
    ]);
    const { pg, close } = await openPlugin(patch, errors, { kb: 4, tone: 7 });
    const ids = (await state(pg)).blocks.map((b) => b.id).sort();
    await pg.evaluate(() => {
      window.__fire?.('bd_snapshot', {
        particles: [],
        connections: [4, 7],
        powered: [],
        beams: [],
        playheads: [],
      });
    });
    await pg.waitForTimeout(300);
    const fresh = await pg.evaluate(() => {
      const scene = window.__bd_probe.scene;
      return scene.host.createBlock('ToneSource', 0, -8);
    });
    await pg.mouse.up();
    await pg.waitForTimeout(300);
    const added = await pg.evaluate(() =>
      (window.__sent ?? [])
        .filter((x) => x.id === 'bd_commands')
        .flatMap((x) => (x.v as CommandsMessage).commands)
        .filter((command) => command.type === 0)
        .map((command) => command.id),
    );
    await close();
    return [ids.join() === '4,7' && added.length === 1 && added[0] === 8, { ids, added, fresh }];
  },
  /** In a DAW Cmd/Ctrl+S is the DAW's (not cancelled, no panel); the standalone app keeps no link,
   * so it opens Patches › SAVE. */
  async 'quick-save-plugin-keys'(errors: string[]) {
    const run = async (standalone: boolean) => {
      const { pg, close } = await openPlugin(
        plugPatch([{ id: 't', type: 'source.tone', x: 0, y: 0 }]),
        errors,
        undefined,
        standalone,
      );
      await pg.evaluate(() => {
        window.addEventListener('keydown', (event) => {
          window.__prevented = event.defaultPrevented;
        });
      });
      await pg.keyboard.press('ControlOrMeta+s');
      await pg.waitForTimeout(1200);
      const result = await pg.evaluate(() => {
        const pp = window.__bd_probe.scene.PatchesPanel;
        return {
          open: pp.Open,
          tab: pp.Tab,
          prevented: window.__prevented,
          sent: (window.__sent ?? [])
            .map((x) => x.id)
            .filter((id) => /share|openUrl|patchSave/.test(id)),
        };
      });
      if (standalone) await pg.screenshot({ path: `${OUT}/quick-save-standalone.png` });
      await close();
      return result;
    };
    const daw = await run(false),
      app = await run(true);
    return [
      daw.prevented === false &&
        !daw.open &&
        app.prevented === true &&
        app.open &&
        app.tab === 0 &&
        !daw.sent.length &&
        !app.sent.length,
      { daw, app },
    ];
  },
};
