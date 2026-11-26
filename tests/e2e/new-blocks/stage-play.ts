// Stage block tests: playing into a Stage, its panel and its particles (CHG-0021, UI-0012); run by
// tests/e2e/new-blocks.ts.
import {
  OUT,
  browser,
  blk,
  state,
  open,
  idOf,
  openPanel,
  type Tests,
  savedParams,
  setParam,
  pointOf,
} from './harness.ts';
import type { OptionRow, OptionsBlock } from '../pageGlobals.ts';

export const stagePlayTests: Tests = {
  // UI-0012: opening a Stage shows its blocks. When they sit far from the centre and its saved view
  // shows none of them, the view centres on them, zooming out to fit them all.
  async 'stage-opens-on-blocks'(errors) {
    const page = await open(browser, [blk('s', 'source.stage', 0, 0)], errors, {
      macros: [
        {
          block: 's',
          view: { x: 0, y: 0, zoom: 2 },
          blocks: [
            blk('t', 'source.tone', 60, 40),
            blk('pw', 'power.power', 75, 48),
            blk('f', 'fx.filter', 66, 30),
          ],
        },
      ],
    });
    await page.evaluate(
      (stageId) => {
        window.__bd_stage.enter(stageId);
      },
      await idOf(page, 's'),
    );
    await page.waitForTimeout(500);
    const win = await page.evaluate(() => window.__bd_probe.inside);
    if (!win) throw new Error('the Stage did not open');
    const pts = await page.evaluate(() => {
      const probe = window.__bd_probe;
      return probe.state.blocks.map((block) => probe.toCss(block.x, block.y));
    });
    await page.screenshot({ path: `${OUT}/stage-opens-on-blocks.png` });
    // A Stage whose blocks the saved view already shows keeps that view.
    const keptPage = await open(browser, [blk('s', 'source.stage', 0, 0)], errors, {
      macros: [
        { block: 's', view: { x: 30, y: 0, zoom: 1 }, blocks: [blk('t', 'source.tone', -2, 0)] },
      ],
    });
    await keptPage.evaluate(
      (stageId) => {
        window.__bd_stage.enter(stageId);
      },
      await idOf(keptPage, 's'),
    );
    await keptPage.waitForTimeout(500);
    const kept = await keptPage.evaluate(() => window.__bd_probe.toCss(0, 0)[0] - innerWidth / 2);
    await page.close();
    await keptPage.close();
    const visible =
      pts.length === 3 &&
      pts.every(([x, y]) => x > win.x && x < win.x + win.w && y > win.y && y < win.y + win.h);
    const xs = pts.map((pt) => pt[0]),
      ys = pts.map((pt) => pt[1]);
    const centred =
      Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - (win.x + win.w / 2)) < 2 &&
      Math.abs((Math.min(...ys) + Math.max(...ys)) / 2 - (win.y + win.h / 2)) < 2;
    const keptView = Math.abs(kept - 30 * (1280 / 850)) < 2;
    return [visible && centred && keptView, { pts, win, kept }];
  },
  // UI-0012: the computer's keys play a Keyboard inside a Stage from outside it; a Keyboard
  // touching a Stage plays its Stage In.
  async 'stage-keys'(errors) {
    const keyboardPage = await open(browser, [blk('s', 'source.stage', 0, 0)], errors, {
      macros: [
        {
          block: 's',
          blocks: [blk('t', 'source.tone', 0, 0), blk('k', 'input.computer-keyboard', 3, 0)],
        },
      ],
    });
    const quiet1 = (await state(keyboardPage)).rms < 0.0005;
    await keyboardPage.keyboard.down('KeyQ');
    await keyboardPage.waitForTimeout(500);
    const keyPlays = (await state(keyboardPage)).rms > 0.005;
    await keyboardPage.keyboard.up('KeyQ');
    await keyboardPage.close();
    const stageInPage = await open(
      browser,
      [blk('s', 'source.stage', 0, 0), blk('k', 'input.computer-keyboard', -3, 0)],
      errors,
      {
        macros: [
          {
            block: 's',
            blocks: [blk('t', 'source.tone', 0, 0), blk('in', 'input.stage-in', 3, 0)],
          },
        ],
      },
    );
    const quiet2 = (await state(stageInPage)).rms < 0.0005;
    await stageInPage.keyboard.down('KeyE');
    await stageInPage.waitForTimeout(500);
    const stageInPlays = (await state(stageInPage)).rms > 0.005;
    await stageInPage.keyboard.up('KeyE');
    await stageInPage.close();
    return [
      quiet1 && keyPlays && quiet2 && stageInPlays,
      { quiet1, keyPlays, quiet2, stageInPlays },
    ];
  },
  // R13b: a Stage's panel has Keep Particles (off by default); the switch is saved with the patch.
  async 'stage-keep-particles'(errors) {
    const page = await open(browser, [blk('st', 'source.stage', 0, 0)], errors);
    await openPanel(page, 'st');
    const switches = () =>
      page.evaluate(() =>
        (
          window.__bd_probe.scene.OptionsPanel.SelectedBlock as OptionsBlock
        ).OptionsForm.parameters.flatMap((param) =>
          param.type === 'switches'
            ? (param.switches ?? []).map((each): [string, boolean] => [each.name, !!each.value])
            : [],
        ),
      );
    const before = await switches();
    await setParam(page, 'keepParticles', true);
    await page.waitForTimeout(300);
    const saved = await savedParams(page, 'st');
    await page.mouse.click(1100, 700);
    await page.waitForTimeout(500);
    await openPanel(page, 'st');
    const after = await switches();
    await page.screenshot({ path: `${OUT}/stage-keep-particles.png` });
    await page.close();
    const pass =
      JSON.stringify(before) === '[["Keep Particles",false]]' &&
      saved.keepParticles === 1 &&
      JSON.stringify(after) === '[["Keep Particles",true]]';
    return [pass, { before, saved, after }];
  },
  // No LOAD PATCH (OPEN or the gallery's INSERT does that with the Stage open): the last row is
  // OPEN STAGE alone, and a real click on it opens the Stage.
  async 'stage-panel-buttons'(errors) {
    const page = await open(browser, [blk('st', 'source.stage', 0, 0)], errors);
    await page.evaluate(() => {
      const seen: string[] = (window.__pressed = []);
      window.__bd_probe.scene.host.openStage = () => {
        seen.push('open');
      };
    });
    await openPanel(page, 'st');
    const row = await page.evaluate(() => {
      const optionsPanel = window.__bd_probe.scene.OptionsPanel,
        pixelRatio = window.__bd_probe.v1App.Metrics.PixelRatio;
      const openRow = (optionsPanel.Options as OptionRow[]).find(
        (each) => each.Setting === 'openStage',
      );
      if (!openRow) return null;
      const y =
        (optionsPanel.Position.y + openRow.Position.y + openRow.Size.height / 2) / pixelRatio;
      return {
        rows: (optionsPanel.Options as OptionRow[]).map((each) => each.Type),
        type: openRow.Type,
        text: openRow._Text,
        at: [
          (optionsPanel.Position.x + optionsPanel.Margin + optionsPanel.Range * 0.5) / pixelRatio,
          y,
        ],
      };
    });
    if (!row) {
      await page.close();
      return [false, 'no OPEN STAGE row'];
    }
    await page.screenshot({ path: `${OUT}/stage-panel-buttons.png` });
    await page.mouse.move(row.at[0], row.at[1]);
    await page.mouse.click(row.at[0], row.at[1]);
    await page.waitForTimeout(200);
    const pressed = await page.evaluate(() => window.__pressed);
    await page.close();
    return [
      row.type === 'actionbutton' &&
        row.text === 'Open Stage' &&
        !row.rows.includes('buttonpair') &&
        pressed?.join() === 'open',
      { ...row, pressed },
    ];
  },
  // With a Stage open, INSERT (Patches › OPEN, or the gallery) puts the patch inside it, placed
  // like any insert; its own Stage blocks stay out (one level). The world outside is untouched.
  async 'stage-insert-inside'(errors) {
    const page = await open(
      browser,
      [blk('st', 'source.stage', 0, 0), blk('out', 'source.tone', 8, 0)],
      errors,
    );
    const mine = {
      format: 'blokdust.patch',
      version: 2,
      seed: 1,
      meta: { title: 'Two Blocks' },
      blocks: [
        blk('a', 'source.tone', 0, 0),
        blk('b', 'power.power', 2, 0),
        blk('s', 'source.stage', 4, 0),
      ],
    };
    await page.evaluate((patch) => {
      localStorage.setItem(
        'blokdust.myPatches',
        JSON.stringify([{ title: 'Two Blocks', saved: Date.UTC(2026, 10, 1), patch }]),
      );
    }, mine);
    await page.evaluate(
      (stageId) => {
        window.__bd_stage.enter(stageId);
      },
      await idOf(page, 'st'),
    );
    await page.waitForTimeout(800);
    const click = async (name: string, wait = 800) => {
      const centre = await page.evaluate(
        (control) => window.__bd_probe.scene.PatchesPanel.centreOf(control),
        name,
      );
      if (!centre) throw new Error(`no control ${name}`);
      const [x, y] = centre;
      await page.mouse.move(x, y);
      await page.mouse.click(x, y);
      await page.waitForTimeout(wait);
    };
    await page.evaluate(() => {
      try {
        localStorage.removeItem('blokdust.patchesTab');
      } catch {
        // Storage may be off; the tab is then the default anyway.
      }
    });
    await page.mouse.move(1138, 45);
    await page.mouse.click(1138, 45);
    // PATCHES, then its OPEN tab, then INSERT on Two Blocks: its blocks follow the pointer.
    await page.waitForTimeout(1500);
    await click('tab1', 1100);
    await click('ins0', 1000);
    await page.mouse.move(640, 500);
    // Put them down.
    await page.mouse.click(640, 500);
    await page.waitForTimeout(500);
    const inner = await page.evaluate(() =>
      [...window.__bd_probe.state.patch.blocks].map((block) => block.type).sort(),
    );
    const stillInside = await page.evaluate(() => !!window.__bd_probe.inside);
    await page.evaluate(() => {
      window.__bd_stage.exit();
    });
    await page.waitForTimeout(800);
    const after = await state(page);
    await page.close();
    const outer = after.patch.blocks.map((block) => block.type).sort();
    const macro = (after.patch.macros ?? []).find((each) => each.block === 'st');
    const inStage = (macro?.blocks ?? []).map((block) => block.type).sort();
    return [
      JSON.stringify(outer) === JSON.stringify(['source.stage', 'source.tone']) &&
        JSON.stringify(inStage) === JSON.stringify(['power.power', 'source.tone']),
      { inner, stillInside, outer, inStage },
    ];
  },
  // A double click on a Stage opens it, and its options panel never shows (the first click had
  // set it on its way open).
  async 'stage-double-click-no-panel'(errors) {
    const page = await open(browser, [blk('st', 'source.stage', 0, 0)], errors);
    const at = await pointOf(page, 'st');
    await page.mouse.move(at[0], at[1]);
    await page.mouse.click(at[0], at[1]);
    await page.waitForTimeout(120);
    await page.mouse.click(at[0], at[1]);
    let maxScale = 0;
    for (let elapsed = 0; elapsed < 1200; elapsed += 30) {
      maxScale = Math.max(
        maxScale,
        await page.evaluate(() => window.__bd_probe.scene.OptionsPanel.Scale),
      );
      await page.waitForTimeout(30);
    }
    const inside = !!(await page.evaluate(() => window.__bd_probe.inside));
    // A single click still opens the panel (outside again first).
    await page.keyboard.press('Escape');
    await page.waitForTimeout(900);
    const out = !(await page.evaluate(() => window.__bd_probe.inside));
    await openPanel(page, 'st').catch(() => {});
    const single = await page.evaluate(() => window.__bd_probe.scene.OptionsPanel.Scale);
    await page.close();
    return [inside && maxScale === 0 && out && single === 1, { inside, maxScale, out, single }];
  },
};
