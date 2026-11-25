// ui-regressions: The Stage block in the plugins.
import { type RegressionTest } from './harness.ts';
import { openPlugin, plugPatch } from './pluginPage.ts';
import type { CommandsMessage } from '../pageGlobals.ts';
import type { V1BlockView } from './v1Views.ts';

/** What a Stage holds, as bd_macros sends it to the processor. */
interface StageMacro {
  block: string;
  blocks: { id: string; x?: number }[];
}
/** The value of bd_stageView or bd_macros. */
interface StageMessage {
  stage?: number;
  macros?: StageMacro[];
}

export const pluginStageTests: Record<string, RegressionTest> = {
  /** Plugins open a Stage as the web does: bd_stageView asks for its world, edits inside carry
   * `stage`, other worlds' frames are dropped, and leaving sends what is inside (bd_macros). */
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
    const menu = await pg.evaluate(
      () =>
        window.__bd_probe.v1App.BlockCreator.MenuJson.categories
          .find((category) => category.name === 'Source')
          ?.items.map((item) => item.name) ?? [],
    );
    await pg.evaluate(() => {
      (window.__sent ?? []).length = 0;
    });
    await pg.evaluate(() => {
      window.__bd_stage.enter(1);
    });
    await pg.waitForTimeout(700);
    const inside = await pg.evaluate(() => window.__bd_probe.inside?.stage ?? null);
    const sent = (id: string) =>
      pg.evaluate(
        (messageId) =>
          (window.__sent ?? [])
            .filter((message) => message.id === messageId)
            .map((message) => message.v),
        id,
      );
    const views = (await sent('bd_stageView')).map((value) => (value as StageMessage).stage);
    const innerTone = await pg.evaluate(() => window.__bd_probe.idOf('t'));
    // Drag the inner Tone: its move goes to the Stage's world.
    const at =
      innerTone === undefined
        ? null
        : await pg.evaluate((i) => window.__bd_probe.blockPoint(i), innerTone);
    if (at) {
      await pg.mouse.move(at[0], at[1]);
      await pg.mouse.down();
      await pg.mouse.move(at[0] + 200, at[1] + 40, { steps: 8 });
      await pg.mouse.up();
      await pg.waitForTimeout(400);
    }
    const moves = (await sent('bd_commands'))
      .flatMap((value) => (value as CommandsMessage).commands)
      .filter((command) => command.type === 2);
    const movedInside =
      moves.length > 0 && moves.every((move) => move.stage === 1 && move.id === innerTone);
    // A frame of the outer world is dropped while inside; one of this Stage's world shows.
    const frame = (view: number, particles: number) =>
      pg.evaluate(
        ([key, count]) => {
          window.__fire?.('bd_snapshot', {
            view: key,
            particles: Array.from({ length: count * 3 }, () => 1),
            connections: [],
            powered: [],
            beams: [],
          });
        },
        [view, particles] as const,
      );
    const before = await pg.evaluate(() => window.__bd_probe.state.particles);
    await frame(0, 4);
    await pg.waitForTimeout(100);
    const afterOuter = await pg.evaluate(() => window.__bd_probe.state.particles);
    await frame(1, 2);
    await pg.waitForTimeout(100);
    const afterInner = await pg.evaluate(() => window.__bd_probe.state.particles);
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(500);
    const out = await pg.evaluate(() => window.__bd_probe.inside === null);
    const back = (await sent('bd_stageView'))
      .map((value) => (value as StageMessage).stage)
      .slice(1);
    const macros = ((await sent('bd_macros')).pop() as StageMessage | undefined)?.macros ?? [];
    const tone = macros.find((macro) => macro.block === 's')?.blocks.find((b) => b.id === 't');
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
      !!tone &&
      tone.x !== 0;
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
        saved: tone,
      },
    ];
  },
  /** A Stage's panel in the plugins has OPEN STAGE and LOAD PATCH, as on the web; OPEN STAGE opens
   * it. */
  async 'plugin-stage-panel-buttons'(errors: string[]) {
    const { pg, close } = await openPlugin(
      plugPatch([{ id: 's', type: 'source.stage', x: 0, y: 0 }]),
      errors,
      { s: 1 },
    );
    const at = await pg.evaluate(() => window.__bd_probe.blockPoint(1));
    if (at) {
      await pg.mouse.move(at[0], at[1]);
      await pg.mouse.click(at[0], at[1]);
    }
    await pg
      .waitForFunction(
        () => {
          const optionsPanel = window.__bd_probe.scene.OptionsPanel;
          return (
            optionsPanel.Scale === 1 &&
            !optionsPanel.Opening &&
            (optionsPanel.SelectedBlock as V1BlockView | undefined)?.Id === 1
          );
        },
        null,
        { timeout: 5000 },
      )
      .catch(() => {});
    await pg.waitForTimeout(400);
    const settings = await pg.evaluate(() =>
      window.__bd_probe.scene.OptionsPanel.Options.map((option) => option.Setting),
    );
    await pg.evaluate(() => {
      (window.__bd_probe.scene.OptionsPanel.SelectedBlock as V1BlockView | undefined)?.SetParam(
        'openStage',
        1,
      );
    });
    await pg.waitForTimeout(700);
    const opened = await pg.evaluate(() => window.__bd_probe.inside?.stage ?? null);
    await close();
    const ok = settings.includes('openStage') && opened === 1;
    return [ok, { settings, opened }];
  },
  /** Plugins: MAKE STAGE and Cmd/Ctrl+D on a Stage build its insides in its own world (commands
   * carry `stage`), and bd_macros tells the processor, so the DAW project keeps them. */
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
      (window.__sent ?? []).length = 0;
    });
    const made = await pg.evaluate(() => window.__bd_stage.wrap([1, 2], 0, 0));
    await pg.waitForTimeout(400);
    const all = () => pg.evaluate(() => window.__sent ?? []);
    const commandsIn = (log: { id: string; v: unknown }[]) =>
      log
        .filter((message) => message.id === 'bd_commands')
        .flatMap((message) => (message.v as CommandsMessage).commands);
    const macrosIn = (log: { id: string; v: unknown }[]) =>
      (log.filter((message) => message.id === 'bd_macros').pop()?.v as StageMessage | undefined)
        ?.macros ?? [];
    const sent1 = await all();
    const cmds1 = commandsIn(sent1);
    const innerAdds1 = cmds1.filter((command) => command.type === 0 && command.stage === made);
    const stray1 = cmds1.filter(
      (command) =>
        command.type === 0 &&
        !command.stage &&
        command.blockType !== undefined &&
        command.id !== made,
    );
    const m1 = macrosIn(sent1);
    const uid = await pg.evaluate(
      () => window.__bd_probe.state.patch.blocks.find((b) => b.type === 'source.stage')?.id,
    );
    // Copy it.
    await pg.evaluate(() => {
      (window.__sent ?? []).length = 0;
    });
    await pg.evaluate((id) => {
      if (id !== null) window.__bd_probe.select([id]);
    }, made);
    await pg.keyboard.press(process.platform === 'darwin' ? 'Meta+d' : 'Control+d');
    await pg.waitForTimeout(400);
    const sent2 = await all();
    const cmds2 = commandsIn(sent2);
    const copy = cmds2.find(
      (command) => command.type === 0 && !command.stage && command.id !== made,
    )?.id;
    const innerAdds2 = cmds2.filter((command) => command.type === 0 && command.stage === copy);
    const stray2 = cmds2.filter(
      (command) => command.type === 0 && !command.stage && command.id !== copy,
    );
    const m2 = macrosIn(sent2);
    await close();
    const ok =
      typeof made === 'number' &&
      innerAdds1.length === 2 &&
      stray1.length === 0 &&
      m1.some((macro) => macro.block === uid && macro.blocks.length === 2) &&
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
        macros1: m1.map((macro) => [macro.block, macro.blocks.length]),
        copy,
        innerAdds2: innerAdds2.length,
        stray2,
        macros2: m2.map((macro) => [macro.block, macro.blocks.length]),
      },
    ];
  },
};
