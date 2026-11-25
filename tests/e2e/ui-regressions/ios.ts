// ui-regressions: iPhone and iPad: Safari's quirks, the audio session and the iPad extension.
import { OUT, blk, browser, comp, open, type Block, type RegressionTest, url } from './harness.ts';

export const iosTests: Record<string, RegressionTest> = {
  /** Owner (2026-11-08, iPhone/iPad Safari): a hard press raised the magnifier, and swiping could select the whole
   * page. Ported from Funputs (#45): `-webkit-touch-callout: none` + `user-select: none` disarm the callout and
   * selection, and a non-passive `touchstart` on the stage cancels Safari's long-press / double-tap recognisers
   * (preventDefault on pointerdown does not reach them). Text fields keep their defaults. No offline browser runs
   * WebKit's recognisers, so this pins the mechanism; the owner's phone confirms the fix. */
  async 'ios-no-magnifier'(errors) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await ctx.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
    await page.waitForFunction(() => window.__bd_probe);
    const result = await page.evaluate(() => {
      const canvas = document.querySelector('#stage canvas')!,
        cs = (element: Element) => getComputedStyle(element) as any;
      const touch = (el: Element) => {
        const touch = new Touch({ identifier: 1, target: el, clientX: 100, clientY: 300 });
        const ev = new TouchEvent('touchstart', {
          cancelable: true,
          bubbles: true,
          touches: [touch],
          targetTouches: [touch],
          changedTouches: [touch],
        });
        el.dispatchEvent(ev);
        return ev.defaultPrevented;
      };
      const field = document.createElement('input');
      document.body.appendChild(field);
      const out = {
        coarse: matchMedia('(pointer: coarse)').matches,
        callout: [...document.querySelectorAll('style')].some((hTMLStyleElement) =>
          /touch-callout:\s*none/.test(hTMLStyleElement.textContent ?? ''),
        ), // Chromium drops the WebKit-only property
        select: [document.documentElement, document.body, canvas].map(
          (element) => cs(element).userSelect,
        ),
        fieldSelect: cs(field).userSelect,
        stageTouchCancelled: touch(canvas),
        fieldTouchCancelled: touch(field),
      };
      field.remove();
      return out;
    });
    await ctx.close();
    const ok =
      result.coarse &&
      result.select.every((value) => value === 'none') &&
      result.fieldSelect !== 'none' &&
      result.stageTouchCancelled &&
      !result.fieldTouchCancelled &&
      result.callout;
    return [ok, result];
  },
  /** Owner (2026-11-08): on iOS there was no sound with the silent switch on. Safari's default audio session
   * ("auto") routes the page like a notification sound; `navigator.audioSession.type = 'playback'`, set before the
   * AudioContext exists, is what a music app asks for (Safari 16.4+; Funputs demo-runtime does the same). A
   * Microphone block needs "play-and-record", set before asking for the mic. Chromium has no audioSession, so
   * the test stands one in and records the order. */
  // Owner, 2026-11-14 (iOS): leave the browser, play a video or podcast, stop it, come back: iOS has interrupted the
  // AudioContext, so the engine stood still (no sound, no new connections, lines stretched after dragged blocks).
  // Coming back to the page, or the next press, resumes it; a press also kicks a context that says it runs but renders
  // nothing (suspend, then resume).
  async 'audio-resumes-after-interruption'(errors) {
    const page = await browser.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const AC = window.AudioContext;
      window.AudioContext = class extends AC {
        constructor(options?: AudioContextOptions) {
          super(options);
          window.__ctx = this;
        }
      };
    });
    await page.goto(
      `${url}/index.html?v1=${comp([blk(1, 'ToneSource', 0, 0), blk(2, 'Power', 0, 0)])}`,
    );
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForFunction(() => window.__bd_probe.state.snapshots > 2);
    const snaps = () => page.evaluate(() => window.__bd_probe.state.snapshots as number);
    const interrupt = () => page.evaluate(() => window.__ctx.suspend());
    // Interrupted while away; the page shows again.
    await interrupt();
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('pageshow'));
    });
    await page.waitForTimeout(500);
    const a = await snaps();
    await page.waitForTimeout(300);
    const backOnShow =
      (await snaps()) > a && (await page.evaluate(() => window.__ctx.state)) === 'running';
    // Interrupted again with no page event: the next press on the stage brings it back.
    await interrupt();
    await page.waitForTimeout(300);
    await page.mouse.click(900, 650);
    await page.waitForTimeout(500);
    const b = await snaps();
    await page.waitForTimeout(300);
    const backOnPress =
      (await snaps()) > b && (await page.evaluate(() => window.__ctx.state)) === 'running';
    await page.close();
    return [backOnShow && backOnPress, { backOnShow, backOnPress }];
  },
  async 'ios-silent-switch'(errors) {
    const run = async (blocks: Block[]) => {
      const page = await browser.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(() => {
        const log: string[] = (window.__session = []);
        let type = 'auto';
        Object.defineProperty(navigator, 'audioSession', {
          value: {
            get type() {
              return type;
            },
            set type(v: string) {
              type = v;
              log.push(`type=${v}`);
            },
          },
        });
        const AC = window.AudioContext;
        window.AudioContext = class extends AC {
          constructor(options?: AudioContextOptions) {
            log.push('AudioContext');
            super(options);
          }
        };
        const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = (constraints?: MediaStreamConstraints) => {
          log.push('getUserMedia');
          return gum(constraints);
        };
      });
      await page.goto(`${url}/index.html?v1=${comp(blocks)}`);
      await page.waitForFunction(() => window.__bd_probe);
      await page.click('#start');
      await page.waitForFunction(() => window.__bd_probe.state.snapshots > 2);
      await page.waitForTimeout(300);
      const log = await page.evaluate(() => window.__session as string[]);
      await page.close();
      return log;
    };
    const plain = await run([blk(1, 'ToneSource', 0, 0)]);
    const mic = await run([blk(1, 'Microphone', 0, 0)]);
    const before = (log: string[], a: string, b: string) =>
      log.includes(a) && log.includes(b) && log.indexOf(a) < log.indexOf(b);
    const ok =
      before(plain, 'type=playback', 'AudioContext') &&
      !plain.includes('getUserMedia') &&
      before(mic, 'type=playback', 'AudioContext') &&
      before(mic, 'type=play-and-record', 'getUserMedia');
    return [ok, { plain, mic }];
  },
  /** Owner (2026-11-16, CHG-0025): a plugin inside another iPad app can't open Safari (the link is only copied), so
   * it shows no links: About keeps the developers' blurbs but not their websites or Twitter names, and the footer's
   * "View the code on GitHub" is gone; pressing where they were opens nothing. */
  async 'ipad-extension-no-links'(errors: string[]) {
    const page = await open(browser, [], errors);
    await page.evaluate(() => {
      const seen: string[] = (window.__texts = []);
      const drawText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text: string, ...a: any[]) {
        seen.push(text);
        return (drawText as any).call(this, text, ...a);
      };
      window.__opened = [];
      window.open = (target?: string | URL) => {
        window.__opened.push(String(target));
        return null;
      };
    });
    const linkAt = await page.evaluate(() => {
      const settingsPanel = window.__bd_probe.scene.SettingsPanel;
      settingsPanel.OpenPanel();
      return null;
    });
    await page.waitForTimeout(1200);
    const before = await page.evaluate(() =>
      window.__bd_probe.scene.SettingsPanel.footerLinks(),
    );
    await page.evaluate(() => {
      window.__bd_probe.hideLinks();
      window.__texts.length = 0;
    });
    const about = await page.evaluate(() => {
      const menuCategory = window.__bd_probe.scene.SettingsPanel.MenuItems[2],
        pr = window.__bd_probe.v1App.Metrics.PixelRatio;
      return [menuCategory.Position.x / pr, 30];
    });
    await page.mouse.move(about[0], about[1]);
    await page.mouse.click(about[0], about[1]);
    await page.waitForTimeout(1200);
    const after = await page.evaluate(() =>
      window.__bd_probe.scene.SettingsPanel.footerLinks(),
    );
    // Press across the About columns' link lines and where the footer link was.
    for (let x = 100; x < 1200; x += 40)
      for (const y of [440, 455, 470, 485, 500]) await page.mouse.click(x, y);
    if (before[0]) await page.mouse.click(before[0].x, before[0].y);
    await page.waitForTimeout(300);
    const result = await page.evaluate(() => {
      const texts: string[] = window.__texts;
      return {
        github: texts.includes('View the code on GitHub'),
        twitter: texts.some((x) => x.startsWith('@')),
        blurb: texts.some((x) => x.includes('Luke')),
        opened: window.__opened,
      };
    });
    await page.screenshot({ path: `${OUT}/ipad-extension-no-links.png` });
    await page.close();
    linkAt;
    const ok =
      before.length === 1 &&
      after.length === 0 &&
      !result.github &&
      !result.twitter &&
      result.blurb &&
      result.opened.length === 0;
    return [ok, { footerBefore: before.length, footerAfter: after.length, ...result }];
  },
};
