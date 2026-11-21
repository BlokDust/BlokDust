// A first visit and v1's tour (CHG-0035, SPEC-VISUAL-V1-PARITY R12): ui-regressions' tests for them, one file per area.
import type { Browser, Page } from 'playwright';

export interface TourHarness {
  browser: Browser; url: string; OUT: string;
  toCss: (p: Page, x: number, y: number) => Promise<[number, number]>;
  maxOver: (p: Page, key: 'rms' | 'particles', ms: number) => Promise<number>;
}

export function tourTests({ browser, url, OUT, toCss, maxOver }: TourHarness): Record<string, (errors: string[]) => Promise<[boolean, unknown]>> {
  return {
  async 'first-visit-empty'(errors: string[]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(`${url}/index.html?tour=1`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
    await p.waitForTimeout(1800);
    const r = await p.evaluate(() => { const b = (window as any).__bd_probe, t = b.scene.Tutorial; return { blocks: b.state.blocks.length, asked: !!(t.SplashOpen || t.Open) }; });
    await p.screenshot({ path: `${OUT}/first-visit-empty.png` });
    await ctx.close();
    return [r.blocks === 0 && r.asked, r];
  },
  async 'tour'(errors: string[]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(`${url}/index.html?demo&tour=1`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
    await p.waitForTimeout(1800);
    const tut = () => p.evaluate(() => { const t = (window as any).__bd_probe.scene.Tutorial; return { splash: t.SplashOpen, open: t.Open, scene: t.CurrentScene, total: t.TotalScenes, hot: (window as any).__bd_probe.scene.TutorialHotspots.Points.length, blocks: (window as any).__bd_probe.state.blocks.length }; });
    const asked = await tut();
    await p.screenshot({ path: `${OUT}/tour-welcome.png` });
    await p.evaluate(() => (window as any).__bd_probe.scene.setWorldPower(false));  // owner: power off before the tour
    // TAKE THE TOUR: v1's hit box, left of the centre line under the message.
    const take = await p.evaluate(() => { const A = (window as any).__bd_probe.v1App, u = A.Unit, pr = A.Metrics.PixelRatio; return [(A.Width / 2 - 60 * u) / pr, (A.Height / 2 + 20 * u) / pr]; });
    await p.mouse.move(take[0], take[1]); await p.mouse.click(take[0], take[1]); await p.waitForTimeout(1500);
    const started = await tut();
    const host = (type: string, x: number, y: number) => p.evaluate(([t, gx, gy]) => (window as any).__bd_probe.scene.host.createBlock(t, gx, gy), [type, x, y] as const);
    const until = async (n: number) => { await p.waitForFunction(k => (window as any).__bd_probe.scene.Tutorial.CurrentScene >= k, n, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(600); return (await tut()).scene; };
    const steps: number[] = [];
    await host('ToneSource', 0, 0); steps.push(await until(2));
    const kb = await host('ComputerKeyboard', 0, -3); steps.push(await until(3));
    const chop = await host('Chopper', 3, 0); steps.push(await until(4));
    // The options step: open the Chopper, use a slider, close the panel.
    const [cx, cy] = await toCss(p, 3, 0);
    await p.mouse.click(cx + 8, cy + 8); await p.waitForTimeout(1300);
    const slider = await p.evaluate(() => { const o = (window as any).__bd_probe.scene.OptionsPanel, A = (window as any).__bd_probe.v1App, pr = A.Metrics.PixelRatio, s = (o.Options as any[]).findIndex(q => q.Type === 'slider');
      const q = o.Options[s]; return [(o.Position.x + o.Margin + o.Range * 0.3) / pr, (o.Position.y + q.Position.y + q.Size.height / 2) / pr]; });
    await p.mouse.click(slider[0], slider[1]); await p.waitForTimeout(300);
    await p.mouse.click(200, 600); steps.push(await until(5));  // the empty stage: the panel closes
    await p.evaluate(id => (window as any).__bd_probe.scene.host.deleteBlock(id), kb); steps.push(await until(6));
    await host('ParticleEmitter', 0, 4); steps.push(await until(7));
    await host('Power', -3, 4); steps.push(await until(8));
    const last = await p.evaluate(() => { const t = (window as any).__bd_probe.scene.Tutorial; return t.Text.Scenes[t.CurrentScene - 1].Intro; });
    await p.screenshot({ path: `${OUT}/tour-last.png` });
    const kept = await p.evaluate(() => localStorage.getItem('bd.skipTour'));
    const end = { power: await p.evaluate(() => (window as any).__bd_probe.scene.worldPower), particles: await maxOver(p, 'particles', 3000) };
    // Asked once: the next visit is not asked.
    await p.goto(`${url}/index.html?demo&tour=1`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
    await p.waitForTimeout(1800);
    const again = await tut();
    await ctx.close();
    void chop;
    const pass = asked.splash && !asked.open && started.open && started.blocks === 0 && started.scene === 1 && started.hot > 0
      && steps.join() === '2,3,4,5,6,7,8' && /PATCHES/.test(last) && /ADD TO GALLERY/.test(last) && kept === '1' && !again.splash && !again.open
      && end.power && end.particles > 0;
    return [pass, { asked, started, steps, last, kept, end, again }];
  },
  };
}
