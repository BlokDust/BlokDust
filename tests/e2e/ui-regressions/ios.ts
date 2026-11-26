// ui-regressions: iPhone and iPad: Safari's quirks, the audio session and the iPad extension.
import { OUT, blk, browser, comp, open, type Block, type RegressionTest, url } from './harness.ts';
import type { SettingsFooter } from './v1Views.ts';

export const iosTests: Record<string, RegressionTest> = {
  /** iOS Safari: no magnifier or page selection: no callout, user-select none, and a cancelled
   * touchstart on the stage; text fields keep theirs. This pins the mechanism (no WebKit here). */
  async 'ios-no-magnifier'(errors) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
    await page.waitForFunction(() => window.__bd_probe);
    const result = await page.evaluate(() => {
      const canvas = document.querySelector('#stage canvas'),
        userSelect = (element: Element) => getComputedStyle(element).userSelect;
      if (!canvas) throw new Error('no stage canvas');
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
        // In the style sheet: Chromium drops the WebKit-only property.
        callout: [...document.querySelectorAll('style')].some((style) =>
          /touch-callout:\s*none/.test(style.textContent),
        ),
        select: [document.documentElement, document.body, canvas].map(userSelect),
        fieldSelect: userSelect(field),
        stageTouchCancelled: touch(canvas),
        fieldTouchCancelled: touch(field),
      };
      field.remove();
      return out;
    });
    await context.close();
    const ok =
      result.coarse &&
      result.select.every((value) => value === 'none') &&
      result.fieldSelect !== 'none' &&
      result.stageTouchCancelled &&
      !result.fieldTouchCancelled &&
      result.callout;
    return [ok, result];
  },
  /** iOS interrupts the AudioContext while another app plays: coming back to the page, or the next
   * press, resumes it (a press also kicks a context that says it runs but renders nothing). */
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
    const snaps = () => page.evaluate(() => window.__bd_probe.state.snapshots);
    const interrupt = () => page.evaluate(() => window.__ctx?.suspend());
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
      (await snaps()) > a && (await page.evaluate(() => window.__ctx?.state)) === 'running';
    // Interrupted again with no page event: the next press on the stage brings it back.
    await interrupt();
    await page.waitForTimeout(300);
    await page.mouse.click(900, 650);
    await page.waitForTimeout(500);
    const b = await snaps();
    await page.waitForTimeout(300);
    const backOnPress =
      (await snaps()) > b && (await page.evaluate(() => window.__ctx?.state)) === 'running';
    await page.close();
    return [backOnShow && backOnPress, { backOnShow, backOnPress }];
  },
  /** iOS was silent with the silent switch on: audioSession.type is 'playback' before the
   * AudioContext exists, 'play-and-record' before the mic is asked for (a stand-in records it). */
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
            set type(value: string) {
              type = value;
              log.push(`type=${value}`);
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
      const log = await page.evaluate(() => window.__session ?? []);
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
  /** CHG-0025: a plugin inside an iPad app can't open Safari, so it shows no links: About keeps the
   * blurbs, the footer's GitHub link goes, and pressing where they were opens nothing. */
  async 'ipad-extension-no-links'(errors: string[]) {
    const page = await open(browser, [], errors);
    await page.evaluate(() => {
      const seen: string[] = (window.__texts = []);
      const proto = CanvasRenderingContext2D.prototype,
        drawText = Object.getOwnPropertyDescriptor(proto, 'fillText')
          ?.value as typeof proto.fillText;
      proto.fillText = function (text: string, ...rest: [number, number, number?]) {
        seen.push(text);
        drawText.call(this, text, ...rest);
      };
      const opened: string[] = (window.__opened = []);
      window.open = (target?: string | URL) => {
        opened.push(String(target));
        return null;
      };
    });
    await page.evaluate(() => {
      window.__bd_probe.scene.SettingsPanel.OpenPanel();
    });
    await page.waitForTimeout(1200);
    const before = await page.evaluate(() =>
      (window.__bd_probe.scene.SettingsPanel as unknown as SettingsFooter).footerLinks(),
    );
    await page.evaluate(() => {
      window.__bd_probe.hideLinks();
      (window.__texts ?? []).length = 0;
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
      (window.__bd_probe.scene.SettingsPanel as unknown as SettingsFooter).footerLinks(),
    );
    // Press across the About columns' link lines and where the footer link was.
    for (let x = 100; x < 1200; x += 40)
      for (const y of [440, 455, 470, 485, 500]) await page.mouse.click(x, y);
    if (before[0]) await page.mouse.click(before[0].x, before[0].y);
    await page.waitForTimeout(300);
    const result = await page.evaluate(() => {
      const texts = window.__texts ?? [];
      return {
        github: texts.includes('View the code on GitHub'),
        guide: texts.some((x) => x.includes('BlokDust 2 guide')), // CHG-0047
        twitter: texts.some((x) => x.startsWith('@')),
        blurb: texts.some((x) => x.includes('Luke')),
        opened: window.__opened ?? [],
      };
    });
    await page.screenshot({ path: `${OUT}/ipad-extension-no-links.png` });
    await page.close();
    const ok =
      before.length === 1 &&
      after.length === 0 &&
      !result.github &&
      !result.guide &&
      !result.twitter &&
      result.blurb &&
      result.opened.length === 0;
    return [ok, { footerBefore: before.length, footerAfter: after.length, ...result }];
  },
};
