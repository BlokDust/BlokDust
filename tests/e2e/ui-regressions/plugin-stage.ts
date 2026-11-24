// ui-regressions: The Stage block in the plugins.
import { type RegressionTest } from './harness.ts';
import { openPlugin, plugPatch } from './pluginPage.ts';

export const pluginStageTests: Record<string, RegressionTest> = {
  /** The plugins have Stage in the menu and open one as the web does: the page asks the processor for the Stage's
   * world (bd_stageView) and uses the inner ids it was given (innerIds); edits inside go to that world (`stage` on the
   * commands); frames of a world not on show are dropped; leaving sends what is inside (bd_macros) for the DAW's
   * state. */
  async 'plugin-stage'(errors: string[]) {
    const patch = {
      ...plugPatch([
        { id: 's', type: 'source.stage', x: 0, y: 0 },
        { id: 'o', type: 'source.tone', x: 0, y: 8 },
      ]),
      macros: [
        {
          block: 's',
          blocks: [
            { id: 't', type: 'source.tone', x: 0, y: 0, params: {} },
            { id: 'pw', type: 'power.power', x: -4, y: 0, params: {} },
          ],
        },
      ],
    };
    const { pg, close } = await openPlugin(patch, errors, { s: 1, o: 2 }, false, {
      innerIds: { s: { t: 5, pw: 6 } },
    });
    const menu = await pg.evaluate(() =>
      ((window as any).__bd_probe.v1App.BlockCreator.MenuJson.categories as any[])
        .find((c) => c.name === 'Source')
        .items.map((i: any) => i.name),
    );
    await pg.evaluate(() => {
      (window as any).__sent.length = 0;
    });
    await pg.evaluate(() => (window as any).__bd_stage.enter(1));
    await pg.waitForTimeout(700);
    const inside = await pg.evaluate(() => (window as any).__bd_probe.inside?.stage ?? null);
    const sent = (id: string) =>
      pg.evaluate(
        (k) =>
          ((window as any).__sent as { id: string; v: any }[])
            .filter((e) => e.id === k)
            .map((e) => e.v),
        id,
      );
    const views = (await sent('bd_stageView')).map((v: any) => v.stage);
    const innerTone = await pg.evaluate(() => (window as any).__bd_probe.idOf('t'));
    // drag the inner Tone: its move goes to the Stage's world
    const at = (await pg.evaluate((i) => (window as any).__bd_probe.blockPoint(i), innerTone)) as
      [number, number] | null;
    if (at) {
      await pg.mouse.move(at[0], at[1]);
      await pg.mouse.down();
      await pg.mouse.move(at[0] + 200, at[1] + 40, { steps: 8 });
      await pg.mouse.up();
      await pg.waitForTimeout(400);
    }
    const moves = (await sent('bd_commands'))
      .flatMap((v: any) => v.commands)
      .filter((c: any) => c.type === 2);
    const movedInside =
      moves.length > 0 && moves.every((move: any) => move.stage === 1 && move.id === innerTone);
    // a frame of the outer world is dropped while inside; one of this Stage's world shows
    const frame = (view: number, n: number) =>
      pg.evaluate(
        ([key, k]) =>
          (window as any).__fire('bd_snapshot', {
            view: key,
            particles: Array.from({ length: k * 3 }, () => 1),
            connections: [],
            powered: [],
            beams: [],
          }),
        [view, n] as const,
      );
    const before = await pg.evaluate(() => (window as any).__bd_probe.state.particles);
    await frame(0, 4);
    await pg.waitForTimeout(100);
    const afterOuter = await pg.evaluate(() => (window as any).__bd_probe.state.particles);
    await frame(1, 2);
    await pg.waitForTimeout(100);
    const afterInner = await pg.evaluate(() => (window as any).__bd_probe.state.particles);
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(500);
    const out = await pg.evaluate(() => (window as any).__bd_probe.inside === null);
    const back = (await sent('bd_stageView')).map((v: any) => v.stage).slice(1);
    const macros = (await sent('bd_macros')).pop()?.macros ?? [];
    const t = macros
      .find((macro: any) => macro.block === 's')
      ?.blocks.find((b: any) => b.id === 't');
    await close();
    const ok =
      menu.includes('Stage') &&
      inside === 1 &&
      JSON.stringify(views) === '[1]' &&
      innerTone === 5 &&
      movedInside &&
      afterOuter === before &&
      afterInner === 2 &&
      out &&
      JSON.stringify(back) === '[0]' &&
      !!t &&
      t.x !== 0;
    return [
      ok,
      {
        menu,
        inside,
        views,
        innerTone,
        moves: moves.length,
        movedInside,
        before,
        afterOuter,
        afterInner,
        out,
        back,
        saved: t,
      },
    ];
  },
  /** Owner (2026-11-19): a Stage's panel in the plugins has OPEN STAGE and LOAD PATCH, as on the web, and OPEN
   * STAGE opens it. */
  async 'plugin-stage-panel-buttons'(errors: string[]) {
    const { pg, close } = await openPlugin(
      plugPatch([{ id: 's', type: 'source.stage', x: 0, y: 0 }]),
      errors,
      { s: 1 },
    );
    const at = (await pg.evaluate(() => (window as any).__bd_probe.blockPoint(1))) as
      [number, number] | null;
    if (at) {
      await pg.mouse.move(at[0], at[1]);
      await pg.mouse.click(at[0], at[1]);
    }
    await pg
      .waitForFunction(
        () => {
          const optionsPanel = (window as any).__bd_probe.scene.OptionsPanel;
          return (
            optionsPanel.Scale === 1 &&
            !optionsPanel.Opening &&
            optionsPanel.SelectedBlock?.Id === 1
          );
        },
        null,
        { timeout: 5000 },
      )
      .catch(() => {});
    await pg.waitForTimeout(400);
    const settings = await pg.evaluate(() =>
      ((window as any).__bd_probe.scene.OptionsPanel.Options as any[]).map((o) => o.Setting),
    );
    await pg.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock?.SetParam('openStage', 1),
    );
    await pg.waitForTimeout(700);
    const opened = await pg.evaluate(() => (window as any).__bd_probe.inside?.stage ?? null);
    await close();
    const ok = settings.includes('openStage') && opened === 1;
    return [ok, { settings, opened }];
  },
  /** MAKE STAGE from a selection and Cmd/Ctrl+D on a Stage work in the plugins: what goes inside is built in the new
   * Stage's own world (commands carry `stage`), never the outer one, and the processor is told what is inside it
   * (bd_macros), so the DAW project keeps it. */
  async 'plugin-stage-make-and-copy'(errors: string[]) {
    const { pg, close } = await openPlugin(
      plugPatch([
        { id: 'a', type: 'source.tone', x: -2, y: 0 },
        { id: 'b', type: 'power.power', x: -6, y: 0 },
      ]),
      errors,
      { a: 1, b: 2 },
    );
    await pg.evaluate(() => {
      (window as any).__sent.length = 0;
    });
    const made = await pg.evaluate(() => (window as any).__bd_stage.wrap([1, 2], 0, 0));
    await pg.waitForTimeout(400);
    const all = () => pg.evaluate(() => (window as any).__sent as { id: string; v: any }[]);
    const sent1 = await all();
    const cmds1 = sent1.filter((e) => e.id === 'bd_commands').flatMap((e) => e.v.commands);
    const innerAdds1 = cmds1.filter((c: any) => c.type === 0 && c.stage === made);
    const stray1 = cmds1.filter(
      (c: any) => c.type === 0 && !c.stage && c.blockType !== undefined && c.id !== made,
    );
    const m1 = sent1.filter((e) => e.id === 'bd_macros').pop()?.v.macros ?? [];
    const uid = await pg.evaluate(
      () =>
        (window as any).__bd_probe.state.patch.blocks.find((b: any) => b.type === 'source.stage')
          ?.id,
    );
    // copy it
    await pg.evaluate(() => {
      (window as any).__sent.length = 0;
    });
    await pg.evaluate((i) => (window as any).__bd_probe.select([i]), made);
    await pg.keyboard.press(process.platform === 'darwin' ? 'Meta+d' : 'Control+d');
    await pg.waitForTimeout(400);
    const sent2 = await all();
    const cmds2 = sent2.filter((e) => e.id === 'bd_commands').flatMap((e) => e.v.commands);
    const copy = cmds2.find((c: any) => c.type === 0 && !c.stage && c.id !== made)?.id;
    const innerAdds2 = cmds2.filter((c: any) => c.type === 0 && c.stage === copy);
    const stray2 = cmds2.filter((c: any) => c.type === 0 && !c.stage && c.id !== copy);
    const m2 = sent2.filter((e) => e.id === 'bd_macros').pop()?.v.macros ?? [];
    await close();
    const ok =
      typeof made === 'number' &&
      innerAdds1.length === 2 &&
      stray1.length === 0 &&
      m1.some((m: any) => m.block === uid && m.blocks.length === 2) &&
      typeof copy === 'number' &&
      innerAdds2.length === 2 &&
      stray2.length === 0 &&
      m2.length === 2;
    return [
      ok,
      {
        made,
        innerAdds1: innerAdds1.length,
        stray1,
        macros1: m1.map((m: any) => [m.block, m.blocks.length]),
        copy,
        innerAdds2: innerAdds2.length,
        stray2,
        macros2: m2.map((m: any) => [m.block, m.blocks.length]),
      },
    ];
  },
};
