// ui-regressions: The block menu: order, hints and its height.
import { OUT, browser, open, type RegressionTest, url } from './harness.ts';

export const menusTests: Record<string, RegressionTest> = {
  // CHG-0035: Sources, Powers and Interactions list the most used blocks first, in the owner's
  // order; Effects stay alphabetical.
  async 'menus-in-owner-order'(errors: string[]) {
    const page = await open(browser, [], errors);
    const cats = await page.evaluate(() =>
      window.__bd_probe.scene.Header.MenuItems.map((category) =>
        category.Items.map((item) => item.Name.toLowerCase()),
      ),
    );
    await page.close();
    const effects = [...cats[1]].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    const want = {
      source: [
        'Tone',
        'Noise',
        'Wavetable',
        'Sample',
        'Granular',
        'Microphone',
        'Recorder',
        'SampleGen',
        'Stage',
      ],
      power: [
        'Power',
        'Particle Emitter',
        'Laser',
        'Toggle Power',
        'Pulse Power',
        'Counter',
        'Chance',
        'Sound Laser',
        'Prism',
        'Gate',
        'Void',
      ],
      interaction: ['Computer Keyboard', 'MIDI Controller', 'Touchpad', 'Label'],
    };
    // Gate is on its own branch: the order is checked over the blocks this build has.
    const inOrder = (got: string[], want: string[]) => {
      const order = want.map((name) => name.toLowerCase());
      return (
        got.join() === order.filter((name) => got.includes(name)).join() &&
        got.length >= order.length - 1
      );
    };
    return [
      cats.length === 4 &&
        inOrder(cats[0], want.source) &&
        cats[1].join() === effects.join() &&
        inOrder(cats[2], want.power) &&
        inOrder(cats[3], want.interaction),
      { cats },
    ];
  },
  // CHG-0035: the menu's ? hints said SoundCloud and "Chrome only"; every hint is now the block's
  // manifest description, in the owner's words.
  async 'menu-hints-in-owner-words'(errors: string[]) {
    const page = await open(browser, [], errors);
    const hints = await page.evaluate(() =>
      Object.fromEntries(
        window.__bd_probe.scene.Header.MenuItems.flatMap((category) =>
          category.Items.map((item) => [item.Name.toLowerCase(), item.Description]),
        ),
      ),
    );
    await page.close();
    const all = Object.values(hints).join(' ');
    const pass =
      !/soundcloud|creative commons|#blokdust|chrome only/i.test(all) &&
      hints.granular.startsWith('It takes a sample from freesound.org') &&
      hints.sample.includes('freesound.org') &&
      hints.label === 'A text box.' &&
      hints['midi controller'] === 'Trigger sources using any connected USB MIDI device.' &&
      hints.prism === 'Splits and diverts laser beams and particles.' &&
      hints.stage.startsWith('A container for groups of blocks');
    return [pass, hints];
  },
  async 'block-menu-short-view'(errors: string[]) {
    const out: Record<string, unknown> = {};
    let ok = true;
    for (const [name, width, height] of [
      ['garageband', 1000, 290],
      ['laptop', 1000, 528],
      ['tall', 1280, 800],
    ] as const) {
      const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${url}/index.html`);
      await page.waitForFunction(() => window.__bd_probe);
      await page.click('#start');
      await page.waitForTimeout(1500);
      const at = await page.evaluate(() => {
        const hd = window.__bd_probe.scene.Header,
          menuCategory = hd.MenuItems[0],
          unit = window.__bd_probe.v1App.Unit;
        return [
          menuCategory.Position.x / devicePixelRatio,
          (hd.Height * 0.5 * unit) / devicePixelRatio,
        ];
      });
      await page.mouse.move(at[0], at[1]);
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForTimeout(1200);
      const result = await page.evaluate(() => {
        const hd = window.__bd_probe.scene.Header,
          unit = window.__bd_probe.v1App.Unit,
          it = hd.MenuItems[0].Items[0];
        return {
          drop: hd.DropDown,
          full: hd.DropDownHeight,
          centre: (hd.Height + hd.DropDown * 0.5) * unit,
          itemY: it.Position.y,
        };
      });
      await page.screenshot({ path: `${OUT}/block-menu-${name}.png` });
      await context.close();
      const centred = Math.abs(result.itemY - result.centre) < 1;
      // Up to MaxAspect (2:1) v1's height; past it, in proportion (GarageBand 1000×290: 58%).
      const want = result.full * Math.min(1, (height * 2) / width);
      const good = result.drop > 0 && Math.abs(result.drop - want) < 0.5 && centred;
      out[name] = { good, drop: Math.round(result.drop), full: Math.round(result.full), centred };
      ok &&= good;
    }
    return [ok, out];
  },
};
