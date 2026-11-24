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
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    const r = await p.evaluate(() => {
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
      r.coarse &&
      r.select.every((v) => v === 'none') &&
      r.fieldSelect !== 'none' &&
      r.stageTouchCancelled &&
      !r.fieldTouchCancelled &&
      r.callout;
    return [ok, r];
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
    const p = await browser.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.addInitScript(() => {
      const AC = window.AudioContext;
      (window as any).AudioContext = class extends AC {
        constructor(o?: AudioContextOptions) {
          super(o);
          (window as any).__ctx = this;
        }
      };
    });
    await p.goto(
      `${url}/index.html?v1=${comp([blk(1, 'ToneSource', 0, 0), blk(2, 'Power', 0, 0)])}`,
    );
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 2);
    const snaps = () => p.evaluate(() => (window as any).__bd_probe.state.snapshots as number);
    const interrupt = () => p.evaluate(() => (window as any).__ctx.suspend());
    // Interrupted while away; the page shows again.
    await interrupt();
    await p.waitForTimeout(200);
    await p.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('pageshow'));
    });
    await p.waitForTimeout(500);
    const a = await snaps();
    await p.waitForTimeout(300);
    const backOnShow =
      (await snaps()) > a && (await p.evaluate(() => (window as any).__ctx.state)) === 'running';
    // Interrupted again with no page event: the next press on the stage brings it back.
    await interrupt();
    await p.waitForTimeout(300);
    await p.mouse.click(900, 650);
    await p.waitForTimeout(500);
    const b = await snaps();
    await p.waitForTimeout(300);
    const backOnPress =
      (await snaps()) > b && (await p.evaluate(() => (window as any).__ctx.state)) === 'running';
    await p.close();
    return [backOnShow && backOnPress, { backOnShow, backOnPress }];
  },
  async 'ios-silent-switch'(errors) {
    const run = async (blocks: Block[]) => {
      const p = await browser.newPage();
      p.on('pageerror', (e) => errors.push(e.message));
      await p.addInitScript(() => {
        const log: string[] = ((window as any).__session = []);
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
        (window as any).AudioContext = class extends AC {
          constructor(o?: AudioContextOptions) {
            log.push('AudioContext');
            super(o);
          }
        };
        const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = (c?: MediaStreamConstraints) => {
          log.push('getUserMedia');
          return gum(c);
        };
      });
      await p.goto(`${url}/index.html?v1=${comp(blocks)}`);
      await p.waitForFunction(() => (window as any).__bd_probe);
      await p.click('#start');
      await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 2);
      await p.waitForTimeout(300);
      const log = await p.evaluate(() => (window as any).__session as string[]);
      await p.close();
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
    const p = await open(browser, [], errors);
    await p.evaluate(() => {
      const seen: string[] = ((window as any).__texts = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) {
        seen.push(t);
        return (f as any).call(this, t, ...a);
      };
      (window as any).__opened = [];
      window.open = (u?: string | URL) => {
        (window as any).__opened.push(String(u));
        return null;
      };
    });
    const linkAt = await p.evaluate(() => {
      const settingsPanel = (window as any).__bd_probe.scene.SettingsPanel;
      settingsPanel.OpenPanel();
      return null;
    });
    await p.waitForTimeout(1200);
    const before = await p.evaluate(() =>
      (window as any).__bd_probe.scene.SettingsPanel.footerLinks(),
    );
    await p.evaluate(() => {
      (window as any).__bd_probe.hideLinks();
      (window as any).__texts.length = 0;
    });
    const about = await p.evaluate(() => {
      const m = (window as any).__bd_probe.scene.SettingsPanel.MenuItems[2],
        pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio;
      return [m.Position.x / pr, 30];
    });
    await p.mouse.move(about[0], about[1]);
    await p.mouse.click(about[0], about[1]);
    await p.waitForTimeout(1200);
    const after = await p.evaluate(() =>
      (window as any).__bd_probe.scene.SettingsPanel.footerLinks(),
    );
    // Press across the About columns' link lines and where the footer link was.
    for (let x = 100; x < 1200; x += 40)
      for (const y of [440, 455, 470, 485, 500]) await p.mouse.click(x, y);
    if (before[0]) await p.mouse.click(before[0].x, before[0].y);
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      const t: string[] = (window as any).__texts;
      return {
        github: t.includes('View the code on GitHub'),
        twitter: t.some((x) => x.startsWith('@')),
        blurb: t.some((x) => x.includes('Luke')),
        opened: (window as any).__opened,
      };
    });
    await p.screenshot({ path: `${OUT}/ipad-extension-no-links.png` });
    await p.close();
    linkAt;
    const ok =
      before.length === 1 &&
      after.length === 0 &&
      !r.github &&
      !r.twitter &&
      r.blurb &&
      r.opened.length === 0;
    return [ok, { footerBefore: before.length, footerAfter: after.length, ...r }];
  },
};
