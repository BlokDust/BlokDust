// A first visit and v1's tour (CHG-0035, SPEC-VISUAL-V1-PARITY R12): ui-regressions' tests for them, one file per area.
import type { Browser, Page } from 'playwright';

export interface TourHarness {
  browser: Browser;
  url: string;
  OUT: string;
  toCss: (page: Page, x: number, y: number) => Promise<[number, number]>;
  maxOver: (p: Page, key: 'rms' | 'particles', ms: number) => Promise<number>;
}

export function tourTests({
  browser,
  url,
  OUT,
  toCss,
  maxOver,
}: TourHarness): Record<string, (errors: string[]) => Promise<[boolean, unknown]>> {
  return {
    async 'first-visit-empty'(errors: string[]) {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      });
      const page = await ctx.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${url}/index.html?tour=1`);
      await page.waitForFunction(() => window.__bd_probe);
      await page.click('#start');
      await page.waitForFunction(() => window.__bd_probe.state.snapshots > 10);
      await page.waitForTimeout(1800);
      const result = await page.evaluate(() => {
        const b = window.__bd_probe,
          tutorial = b.scene.Tutorial;
        return { blocks: b.state.blocks.length, asked: !!(tutorial.SplashOpen || tutorial.Open) };
      });
      await page.screenshot({ path: `${OUT}/first-visit-empty.png` });
      await ctx.close();
      return [result.blocks === 0 && result.asked, result];
    },
    async tour(errors: string[]) {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      });
      const page = await ctx.newPage();
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
      await page.evaluate(() => window.__bd_probe.scene.setWorldPower(false)); // owner: power off before the tour
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
      const until = async (n: number) => {
        await page
          .waitForFunction((k) => window.__bd_probe.scene.Tutorial.CurrentScene >= k, n, {
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
      const chop = await host('Chopper', 3, 0);
      steps.push(await until(4));
      // The options step: open the Chopper, use a slider, close the panel.
      const [cx, cy] = await toCss(page, 3, 0);
      await page.mouse.click(cx + 8, cy + 8);
      await page.waitForTimeout(1300);
      const slider = await page.evaluate(() => {
        const optionsPanel = window.__bd_probe.scene.OptionsPanel,
          A = window.__bd_probe.v1App,
          pr = A.Metrics.PixelRatio,
          s = (optionsPanel.Options as any[]).findIndex((q) => q.Type === 'slider');
        const option = optionsPanel.Options[s];
        return [
          (optionsPanel.Position.x + optionsPanel.Margin + optionsPanel.Range * 0.3) / pr,
          (optionsPanel.Position.y + option.Position.y + option.Size.height / 2) / pr,
        ];
      });
      await page.mouse.click(slider[0], slider[1]);
      await page.waitForTimeout(300);
      await page.mouse.click(200, 600);
      steps.push(await until(5)); // the empty stage: the panel closes
      await page.evaluate((id) => window.__bd_probe.scene.host.deleteBlock(id), kb);
      steps.push(await until(6));
      await host('ParticleEmitter', 0, 4);
      steps.push(await until(7));
      await host('Power', -3, 4);
      steps.push(await until(8));
      const last = await page.evaluate(() => {
        const tutorial = window.__bd_probe.scene.Tutorial;
        return tutorial.Text.Scenes[tutorial.CurrentScene - 1].Intro;
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
      await ctx.close();
      chop;
      const pass =
        asked.splash &&
        !asked.open &&
        started.open &&
        started.blocks === 0 &&
        started.scene === 1 &&
        started.hot > 0 &&
        steps.join() === '2,3,4,5,6,7,8' &&
        /PATCHES/.test(last) &&
        /ADD TO GALLERY/.test(last) &&
        kept === '1' &&
        !again.splash &&
        !again.open &&
        end.power &&
        end.particles > 0;
      return [pass, { asked, started, steps, last, kept, end, again }];
    },
  };
}
