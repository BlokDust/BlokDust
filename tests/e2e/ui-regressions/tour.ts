// ui-regressions: a first visit and v1's tour (CHG-0035, SPEC-VISUAL-V1-PARITY R12).
import { OUT, browser, maxOver, toCss, url, type RegressionTest } from './harness.ts';
import type { TutorialText } from './v1Views.ts';

export const tourTests: Record<string, RegressionTest> = {
  async 'first-visit-empty'(errors: string[]) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${url}/index.html?tour=1`);
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForFunction(() => window.__bd_probe.state.snapshots > 10);
    await page.waitForTimeout(1800);
    const result = await page.evaluate(() => {
      const probe = window.__bd_probe,
        tutorial = probe.scene.Tutorial;
      return { blocks: probe.state.blocks.length, asked: tutorial.SplashOpen || tutorial.Open };
    });
    await page.screenshot({ path: `${OUT}/first-visit-empty.png` });
    await context.close();
    return [result.blocks === 0 && result.asked, result];
  },
  async tour(errors: string[]) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${url}/index.html?demo&tour=1`);
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForFunction(() => window.__bd_probe.state.snapshots > 10);
    await page.waitForTimeout(1800);
    const tut = () =>
      page.evaluate(() => {
        const tutorial = window.__bd_probe.scene.Tutorial;
        return {
          splash: tutorial.SplashOpen,
          open: tutorial.Open,
          scene: tutorial.CurrentScene,
          total: tutorial.TotalScenes,
          hot: window.__bd_probe.scene.TutorialHotspots.Points.length,
          blocks: window.__bd_probe.state.blocks.length,
        };
      });
    const asked = await tut();
    await page.screenshot({ path: `${OUT}/tour-welcome.png` });
    // The tour starts with the power off.
    await page.evaluate(() => {
      window.__bd_probe.scene.setWorldPower(false);
    });
    // TAKE THE TOUR: v1's hit box, left of the centre line under the message.
    const take = await page.evaluate(() => {
      const v1App = window.__bd_probe.v1App,
        unit = v1App.Unit,
        pr = v1App.Metrics.PixelRatio;
      return [(v1App.Width / 2 - 60 * unit) / pr, (v1App.Height / 2 + 20 * unit) / pr];
    });
    await page.mouse.move(take[0], take[1]);
    await page.mouse.click(take[0], take[1]);
    await page.waitForTimeout(1500);
    const started = await tut();
    const host = (type: string, x: number, y: number) =>
      page.evaluate(([text, gx, gy]) => window.__bd_probe.scene.host.createBlock(text, gx, gy), [
        type,
        x,
        y,
      ] as const);
    const until = async (scene: number) => {
      await page
        .waitForFunction((k) => window.__bd_probe.scene.Tutorial.CurrentScene >= k, scene, {
          timeout: 8000,
        })
        .catch(() => {});
      await page.waitForTimeout(600);
      return (await tut()).scene;
    };
    const steps: number[] = [];
    await host('ToneSource', 0, 0);
    steps.push(await until(2));
    const kb = await host('ComputerKeyboard', 0, -3);
    steps.push(await until(3));
    await host('Chopper', 3, 0);
    steps.push(await until(4));
    // The options step: open the Chopper, use a slider, close the panel.
    const [cx, cy] = await toCss(page, 3, 0);
    await page.mouse.click(cx + 8, cy + 8);
    await page.waitForTimeout(1300);
    const slider = await page.evaluate(() => {
      const optionsPanel = window.__bd_probe.scene.OptionsPanel,
        pr = window.__bd_probe.v1App.Metrics.PixelRatio,
        index = optionsPanel.Options.findIndex((candidate) => String(candidate.Type) === 'slider');
      const option = optionsPanel.Options[index];
      return [
        (optionsPanel.Position.x + optionsPanel.Margin + optionsPanel.Range * 0.3) / pr,
        (optionsPanel.Position.y + option.Position.y + option.Size.height / 2) / pr,
      ];
    });
    await page.mouse.click(slider[0], slider[1]);
    await page.waitForTimeout(300);
    await page.mouse.click(200, 600);
    steps.push(await until(5)); // the empty stage: the panel closes
    if (kb === null) throw new Error('the tour could not add a ComputerKeyboard');
    await page.evaluate((id) => {
      window.__bd_probe.scene.host.deleteBlock(id);
    }, kb);
    steps.push(await until(6));
    await host('ParticleEmitter', 0, 4);
    steps.push(await until(7));
    await host('Power', -3, 4);
    steps.push(await until(8));
    const last = await page.evaluate(() => {
      const tutorial = window.__bd_probe.scene.Tutorial;
      return (tutorial.Text as TutorialText).Scenes[tutorial.CurrentScene - 1].Intro;
    });
    await page.screenshot({ path: `${OUT}/tour-last.png` });
    const kept = await page.evaluate(() => localStorage.getItem('bd.skipTour'));
    const end = {
      power: await page.evaluate(() => window.__bd_probe.scene.worldPower),
      particles: await maxOver(page, 'particles', 3000),
    };
    // Asked once: the next visit is not asked.
    await page.goto(`${url}/index.html?demo&tour=1`);
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForFunction(() => window.__bd_probe.state.snapshots > 10);
    await page.waitForTimeout(1800);
    const again = await tut();
    await context.close();
    const pass =
      asked.splash &&
      !asked.open &&
      started.open &&
      started.blocks === 0 &&
      started.scene === 1 &&
      started.hot > 0 &&
      steps.join() === '2,3,4,5,6,7,8' &&
      last.includes('PATCHES') &&
      last.includes('ADD TO GALLERY') &&
      kept === '1' &&
      !again.splash &&
      !again.open &&
      end.power &&
      end.particles > 0;
    return [pass, { asked, started, steps, last, kept, end, again }];
  },
};
