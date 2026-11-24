// ui-regressions: Playing blocks: pressing them, the computer keyboard and the microphone.
import {
  blk,
  browser,
  comp,
  maxOver,
  open,
  state,
  toCss,
  type Block,
  type RegressionTest,
  url,
} from './harness.ts';
import { openPatches } from './patchesPanel.ts';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

export const playingTests: Record<string, RegressionTest> = {
  /** v1 Source.MouseDown → AddPower: holding the pointer on a source plays it; release stops it. */
  async 'press-plays-source'(errors) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    const idle = await maxOver(p, 'rms', 500);
    const [x, y] = await toCss(p, 0, 0.2);
    await p.mouse.move(x, y);
    await p.mouse.down();
    const held = await maxOver(p, 'rms', 800);
    await p.mouse.up();
    await p.waitForTimeout(1500);
    const after = (await state(p)).rms;
    await p.close();
    return [idle < 1e-4 && held > 0.005 && after < 1e-3, { idle, held, afterRelease: after }];
  },
  /** An unpowered emitter fires nothing; holding the pointer on it powers it (v1 ParticleEmitter is a Source). */
  async 'press-fires-emitter'(errors) {
    const p = await open(browser, [blk(1, 'ParticleEmitter', 0, 0)], errors);
    const idle = await maxOver(p, 'particles', 1500);
    const [x, y] = await toCss(p, 0, 0.5);
    await p.mouse.move(x, y);
    await p.mouse.down();
    const held = await maxOver(p, 'particles', 1500);
    await p.mouse.up();
    await p.close();
    return [idle === 0 && held > 0, { unpoweredParticles: idle, whileHeld: held }];
  },
  // ---- round 2 (2026-11-06) ----

  /** Computer keyboard in Poly mode plays every held key (v1 Source.GetVoice, 9 voices). */
  async 'keyboard-poly'(errors) {
    const p = await open(
      browser,
      [
        { ...blk(1, 'ComputerKeyboard', -3, 0), Params: { isPolyphonic: true } } as Block,
        blk(2, 'ToneSource', 0, 0),
      ],
      errors,
    );
    const before = (await state(p)).gateOns;
    for (const k of ['KeyQ', 'KeyE', 'KeyT']) {
      await p.keyboard.down(k);
      await p.waitForTimeout(60);
    }
    await p.waitForTimeout(400);
    const notes = (await state(p)).gateOns - before;
    for (const k of ['KeyQ', 'KeyE', 'KeyT']) await p.keyboard.up(k);
    await p.close();
    return [notes === 3, { noteOnsForThreeKeys: notes }];
  },
  /** Typing in a text field (Share title, sample search) must not play the computer keyboard (v1 TypingManager meant
   * to disable PianoKeyboardManager while typing; its calls were commented out, so v1 played notes too). Found 2026-11-07. */
  async 'typing-plays-no-notes'(errors) {
    const p = await open(
      browser,
      [blk(1, 'ComputerKeyboard', -3, 0), blk(2, 'ToneSource', 0, 0)],
      errors,
    );
    await openPatches(p); // Patches › SAVE: its name field takes the focus on click
    const [x, y] = await p.evaluate(() => {
      const boundingClientRect = document
        .getElementById('patchTitleInput')!
        .getBoundingClientRect();
      return [boundingClientRect.left + 20, boundingClientRect.top + boundingClientRect.height / 2];
    });
    await p.mouse.click(x, y);
    const before = (await state(p)).gateOns;
    await p.keyboard.type('qwerty');
    await p.waitForTimeout(400);
    const notes = (await state(p)).gateOns - before;
    const focused = await p.evaluate(() => document.activeElement?.id);
    await p.close();
    return [focused === 'patchTitleInput' && notes === 0, { focused, noteOnsWhileTyping: notes }];
  },
  /** Owner idea: keyboards connect to Emitters and Lasers; a held key powers them (keys never aim them: owner, 2026-11-20). */
  async 'keyboard-powers-emitter'(errors: string[]) {
    const p = await open(
      browser,
      [blk(1, 'ComputerKeyboard', -3, 0), blk(2, 'ParticleEmitter', 0, 0)],
      errors,
    );
    await p.waitForTimeout(500);
    const linked = (await state(p)).connections as number[];
    const before = await maxOver(p, 'particles', 600);
    await p.keyboard.down('KeyC');
    const held = await maxOver(p, 'particles', 800);
    await p.keyboard.up('KeyC');
    await p.waitForTimeout(3000);
    const after = await maxOver(p, 'particles', 1500);
    await p.close();
    return [
      linked.length === 2 && before === 0 && held > 0 && after === 0,
      { linked, before, held, after },
    ];
  },
  // Owner (CHG-0009): holding one key and pressing another (legato) fired no particle; every key pressed fires one.
  async 'keyboard-legato-fires-emitter'(errors: string[]) {
    const p = await open(
      browser,
      [blk(1, 'ComputerKeyboard', -3, 0), blk(2, 'ParticleEmitter', 0, 0)],
      errors,
    );
    await p.waitForTimeout(500);
    await p.keyboard.down('KeyZ');
    await p.waitForTimeout(400);
    const first = (await state(p)).particles;
    await p.keyboard.down('KeyC'); // E3 with C3 still held
    await p.waitForTimeout(400);
    const second = (await state(p)).particles;
    await p.keyboard.up('KeyC');
    await p.keyboard.up('KeyZ');
    await p.close();
    return [first === 1 && second === 2, { first, second }];
  },
  // Owner (2026-11-20): a polyphonic keyboard's chord fires the Emitter, never more than once a key. (Keys landing in the
  // same engine tick fire it once: the engine test R2 S6 pins that; here the presses may fall in different ticks.)
  async 'keyboard-poly-chord-fires-emitter'(errors: string[]) {
    const p = await open(
      browser,
      [
        { ...blk(1, 'ComputerKeyboard', -3, 0), Params: { isPolyphonic: true } } as Block,
        blk(2, 'ParticleEmitter', 0, 0),
      ],
      errors,
    );
    await p.waitForTimeout(500);
    for (const k of ['KeyZ', 'KeyC', 'KeyB']) await p.keyboard.down(k); // C3, E3, G3
    await p.waitForTimeout(400);
    const chord = (await state(p)).particles;
    for (const k of ['KeyZ', 'KeyC', 'KeyB']) await p.keyboard.up(k);
    await p.close();
    return [chord >= 1 && chord <= 3, { chord }];
  },
  /** Holding a note key and switching tab (or app) must not leave the note stuck: held keys are released when the
   * page loses focus (it never sees their key-up). */
  async 'keys-release-on-blur'(errors: string[]) {
    const p = await open(
      browser,
      [
        { ...blk(1, 'ComputerKeyboard', -3, 0), Params: { isPolyphonic: true } } as Block,
        blk(2, 'ToneSource', 0, 0),
      ],
      errors,
    );
    await p.keyboard.down('KeyZ');
    const held = await maxOver(p, 'rms', 400);
    await p.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
    });
    await p.waitForTimeout(2500);
    const after = (await state(p)).rms;
    await p.keyboard.up('KeyZ');
    await p.close();
    return [held > 0.005 && after < 0.0005, { held, afterBlur: after }];
  },
  /** A Particle Emitter fires only while powered (Power, a Toggle that is on, a press, a key on a connected
   * keyboard); the demo's emitters are powered by Power blocks, not v1's hidden self-powered mode (owner). */
  async 'emitter-only-when-powered'(errors: string[]) {
    const alone = await open(browser, [blk(1, 'ParticleEmitter', 0, 0)], errors);
    const unpowered = await maxOver(alone, 'particles', 2500);
    await alone.close();
    const powered = await open(
      browser,
      [blk(1, 'ParticleEmitter', 0, 0), blk(2, 'Power', -3, 0)],
      errors,
    );
    const withPower = await maxOver(powered, 'particles', 2500);
    await powered.close();
    const demo = JSON.parse(readFileSync('web/src/demo/demo.patch.json', 'utf8'));
    const selfPowered = demo.blocks
      .filter((b: any) => b.params?.selfPoweredMode)
      .map((b: any) => b.id);
    return [
      unpowered === 0 && withPower > 0 && selfPowered.length === 0,
      { unpowered, withPower, demoSelfPowered: selfPowered },
    ];
  },
  // Owner (2026-11-17, CHG-0035): a Microphone on its own played (a Distortion beside it distorted the voice) though
  // every other source needs power; and trashing the last one left the browser showing the microphone in use.
  async 'microphone-needs-power-and-lets-go'(errors: string[]) {
    const b = await chromium.launch({
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
    });
    try {
      const p = await open(b, [blk(1, 'Microphone', 0, 0), blk(2, 'Distortion', 3, 0)], errors);
      await p.waitForFunction(() => (window as any).__bd_probe.microphoneOpen, null, {
        timeout: 10000,
      });
      await p.waitForTimeout(800);
      const alone = await maxOver(p, 'rms', 1500);
      const power = await p.evaluate(() =>
        (window as any).__bd_probe.scene.host.createBlock('Power', -3, 0),
      );
      await p.waitForTimeout(800);
      const powered = await maxOver(p, 'rms', 1500);
      await p.mouse.click(200, 600);
      await p.waitForTimeout(300); // a made block follows the pointer until a press
      await p.evaluate((id) => {
        const h = (window as any).__bd_probe.scene.host;
        h.deleteBlock(1);
        h.deleteBlock(id);
      }, power);
      await p.waitForTimeout(500);
      const listening = await p.evaluate(() => (window as any).__bd_probe.microphoneOpen);
      await p.close();
      return [alone < 1e-4 && powered > 1e-3 && !listening, { alone, powered, listening }];
    } finally {
      await b.close();
    }
  },
  /** Owner (2026-11-18, iPhone): typing in a text field (Connect's message, a patch's name), the keyboard made the
   * window shorter and the app laid itself out for that, tiny, and stayed so once the keyboard went. While a field is
   * typed into on a touch screen, a height-only change is the keyboard: the layout keeps its size. */
  async 'keyboard-keeps-layout'(errors: string[]) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForTimeout(1500);
    await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.OpenPanel(0));
    await p.waitForTimeout(1200);
    const size = () =>
      p.evaluate(() => {
        const a = (window as any).__bd_probe.v1App;
        return { unit: a.Unit, w: a.Width, h: a.Height, device: a.Metrics.Device };
      });
    const before = await size();
    await p.focus('#patchTitleInput');
    await p.setViewportSize({ width: 390, height: 420 });
    await p.waitForTimeout(700); // the keyboard is up
    const typing = await size();
    await p.evaluate(() => {
      (document.activeElement as HTMLElement).blur();
    });
    await p.setViewportSize({ width: 390, height: 844 });
    await p.waitForTimeout(1200); // and gone
    const after = await size();
    await ctx.close();
    const same = (a: typeof before, b: typeof before) =>
      a.unit === b.unit && a.w === b.w && a.h === b.h && a.device === b.device;
    return [same(before, typing) && same(before, after), { before, typing, after }];
  },
  // Owner (2026-11-14): every block menu category lists its blocks alphabetically (v1's and the new ones mixed).
  // Owner (2026-11-17): the browser's right-click menu took the pointer's release and left a held block stuck down. The
  // page shows none (the stage, panels, empty page); links and text fields keep theirs.
  async 'no-browser-context-menu'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    const [bx, by] = await toCss(p, 0, 0);
    const r = await p.evaluate(
      ([x, y]) => {
        const fire = (el: Element, cx = 10, cy = 10) => {
          const event = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            button: 2,
            clientX: cx,
            clientY: cy,
          });
          el.dispatchEvent(event);
          return event.defaultPrevented;
        };
        const canvas = document.querySelector('canvas')!,
          a = document.createElement('a'),
          input = document.createElement('input');
        a.href = 'https://example.com/';
        a.textContent = 'x';
        document.body.append(a, input);
        const out = {
          block: fire(canvas, x, y),
          empty: fire(canvas, 600, 600),
          body: fire(document.body),
          link: fire(a),
          input: fire(input),
        };
        a.remove();
        input.remove();
        return out;
      },
      [bx, by] as const,
    );
    await p.close();
    return [r.block && r.empty && r.body && !r.link && !r.input, r];
  },
};
