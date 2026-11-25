// ui-regressions: The plugins' patches: saving, reopening and quick save in a DAW.
import { OUT, browser, state, toCss, type RegressionTest, url } from './harness.ts';
import { openPlugin, plugPatch } from './pluginPage.ts';
import { openList, openPatches, patchesClick } from './patchesPanel.ts';

export const pluginPatchesTests: Record<string, RegressionTest> = {
  /** CHG-0005: the header's Share slot reads PATCHES (plugin and web) and opens the Patches panel. In the plugin the
   * files live in ~/Music/BlokDust/Patches: the page asks the editor (bd_patchList / Save / Read / Pick / Apply / Reveal)
   * and the processor merges Open / Insert itself. SAVE TO COMPUTER goes through the editor's save dialog (it replies
   * once the user has chosen); FROM YOUR COMPUTER's file comes back unrequested and the panel asks Open or Insert.
   * Native replies are faked here; `bd plugin test` checks the native side. */
  async 'plugin-patches'(errors: string[]) {
    const spy = () => {
      const seen: string[] = [];
      const drawText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text: string, ...a: any[]) {
        seen.push(text);
        return (drawText as any).call(this, text, ...a);
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
    await pg.evaluate((saved) => {
      const be = window.__JUCE__.backend,
        emit = be.emitEvent,
        fire = window.__fire;
      be.emitEvent = (id: string, value: any) => {
        emit(id, value);
        if (id === 'bd_patchList')
          setTimeout(
            () =>
              fire('bd_patchList', {
                req: value.req,
                items: [
                  {
                    name: 'My Keys',
                    path: '/m/My Keys.blokdust',
                    modified: Date.UTC(2026, 10, 8, 12),
                  },
                ],
              }),
            20,
          );
        if (id === 'bd_patchSave')
          setTimeout(() => fire('bd_patchSaved', { req: value.req, ok: true }), 300); // the user picks a place
        if (id === 'bd_patchRead')
          setTimeout(
            () =>
              fire('bd_patchFile', {
                req: value.req,
                text: JSON.stringify(saved),
                name: 'My Keys',
                mode: 'open',
              }),
            20,
          );
        if (id === 'bd_patchDelete')
          setTimeout(() => fire('bd_patchDeleted', { req: value.req, ok: true }), 20);
        if (id === 'bd_patchPick')
          setTimeout(
            () =>
              fire('bd_patchFile', {
                text: JSON.stringify(saved),
                name: 'My Keys',
                file: 'My Keys.blokdust',
                mode: 'choose',
              }),
            20,
          );
      };
    }, saved);
    await pg.evaluate(spy);
    await pg.waitForTimeout(300);
    const label = await pg.evaluate(() => ({
      patches: window.__texts.includes('PATCHES'),
      share: window.__texts.includes('SHARE'),
    }));
    await openPatches(pg);
    const tab = await pg.evaluate(() => window.__bd_probe.scene.PatchesPanel.Tab);
    await patchesClick(pg, 'save', 600);
    const flash = await pg.evaluate(() =>
      window.__bd_probe.scene.PatchesPanel.flashing('save'),
    );
    // CREATE SHARE LINK (owner, 2026-11-10: in place of SHOW FOLDER; SAVE TO COMPUTER first): opens the patch on the site.
    const order = await pg.evaluate(() => {
      const pp = window.__bd_probe.scene.PatchesPanel;
      return pp.centreOf('save')[0] < pp.centreOf('share')[0];
    });
    await patchesClick(pg, 'share', 400);
    const opened = await pg.evaluate(
      () =>
        window.__sent.find((message) => message.id === 'bd_openUrl')?.v.url as string | undefined,
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
        window.__sent
          .filter((e) => e.id.startsWith('bd_patch'))
          .map((e) => ({ id: e.id, v: e.v })),
      );
    await patchesClick(pg, 'ins1', 900); // the first preset: Insert (no confirm; the processor merges it)
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
    const save = log.find((e) => e.id === 'bd_patchSave'),
      apply = log.filter((e) => e.id === 'bd_patchApply');
    const ins = apply[0] && JSON.parse(apply[0].v.patch),
      open = apply[1] && JSON.parse(apply[1].v.patch);
    const ok =
      label.patches &&
      !label.share &&
      panel.patches &&
      !panel.share &&
      tab === 0 &&
      panel.items[0] === 'My Keys | Saved 8 Nov 2026' &&
      panel.items.some((i: string) => i.endsWith('| Preset')) &&
      !!save?.v.title &&
      flash === true &&
      apply[0]?.v.mode === 'insert' &&
      ins.blocks.length === 6 &&
      !ins.blocks.some((b) => b.id === 't') &&
      asked === 'confirm' &&
      log.some((e) => e.id === 'bd_patchRead' && e.v.path === '/m/My Keys.blokdust') &&
      apply[1]?.v.mode === 'open' &&
      open.blocks.map((b) => b.id).join() === 'k,o' &&
      choice.view === 'file' &&
      choice.picked?.title === 'My Keys' &&
      choice.picked?.fileName === 'My Keys.blokdust' &&
      log.some((e) => e.id === 'bd_patchPick') &&
      order &&
      /^https:\/\/[^?]+\/\?c=p[\w-]+&t=[^&]+&share=1$/.test(opened ?? '') &&
      log.some((e) => e.id === 'bd_patchDelete' && e.v.path === '/m/My Keys.blokdust');
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
        sent: log.map((e) => e.id),
        insertIds: ins?.blocks.map((b) => b.id),
        openIds: open?.blocks.map((b) => b.id),
      },
    ];
  },
  /** Owner (Logic, 2026-11-12): opening the plugin briefly showed an old patch before its own. The web view keeps
   * localStorage between sessions, and the page drew its autosave until the processor's patch arrived. In the plugin
   * the patch comes only from the processor: nothing is drawn before it, and the page never autosaves. */
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
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    await ctx.addInitScript(
      ([old]) => {
        try {
          localStorage.setItem('blokdust2.autosave', JSON.stringify(old));
        } catch {
          /* */
        }
        const listeners: Record<string, ((x: unknown) => void)[]> = {};
        const w = window as any;
        w.__seenBeforePatch = 0;
        w.__patched = false;
        const watch = () => {
          if (w.__patched) return;
          w.__seenBeforePatch = Math.max(
            w.__seenBeforePatch,
            w.__bd_probe?.state.blocks.length ?? 0,
          );
          requestAnimationFrame(watch);
        };
        requestAnimationFrame(watch);
        w.__JUCE__ = {
          backend: {
            addEventListener: (id: string, fn: (x: unknown) => void) => {
              (listeners[id] ??= []).push(fn);
            },
            emitEvent: (id: string) => {
              if (id === 'bd_hello')
                setTimeout(() => {
                  w.__patched = true;
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
    const pg = await ctx.newPage();
    pg.on('pageerror', (error) => errors.push(error.message));
    await pg.goto(`${url}/index.html`);
    await pg.waitForFunction(() => window.__bd_probe?.state.started, null, {
      timeout: 15000,
    });
    await pg.waitForTimeout(800);
    const result = await pg.evaluate(() => ({
      seenBeforePatch: window.__seenBeforePatch,
      blocksAfter: window.__bd_probe.state.blocks.length,
      autosave:
        JSON.parse(localStorage.getItem('blokdust2.autosave') ?? 'null')?.blocks?.length ?? null,
    }));
    await ctx.close();
    return [result.seenBeforePatch === 0 && result.blocksAfter === 0 && result.autosave === 2, result];
  },
  /** Ableton: an FX instance lost its connection lines for good (reload didn't help). After blocks are deleted the
   * processor's engine ids are no longer 1..N, but a reopened (or reloaded) editor numbered the patch's blocks 1..N:
   * the engine's connections then named the wrong blocks, and the page's commands moved the wrong ones. The editor
   * now sends the engine's ids with the patch and the page uses them. */
  async 'plugin-reopen-keeps-ids'(errors: string[]) {
    const patch = plugPatch([
      { id: 'kb', type: 'input.midi-controller', x: 8, y: 0 },
      { id: 'tone', type: 'source.tone', x: 11, y: 0 },
    ]);
    const { pg, close } = await openPlugin(patch, errors, { kb: 4, tone: 7 });
    const ids = (await state(pg)).blocks.map((b) => b.id).sort();
    await pg.evaluate(() =>
      window.__fire('bd_snapshot', {
        particles: [],
        connections: [4, 7],
        powered: [],
        beams: [],
        playheads: [],
      }),
    );
    await pg.waitForTimeout(300);
    const fresh = await pg.evaluate(() => {
      const scene = window.__bd_probe.scene;
      return scene.host.createBlock('ToneSource', 0, -8);
    });
    await pg.mouse.up();
    await pg.waitForTimeout(300);
    const added = await pg.evaluate(() =>
      window.__sent
        .filter((x) => x.id === 'bd_commands')
        .flatMap((x) => x.v.commands)
        .filter((c) => c.type === 0)
        .map((c) => c.id),
    );
    await close();
    return [ids.join() === '4,7' && added.length === 1 && added[0] === 8, { ids, added, fresh }];
  },
  /** In a DAW Cmd/Ctrl+S is the DAW's (not cancelled, no panel); the standalone app keeps no link, so it opens
   * Patches › SAVE. */
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
          sent: (window.__sent as { id: string }[])
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
