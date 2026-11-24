// ui-regressions: The power switch: on, off, the plugin's HOST mode, and toggles saved with the patch.
import { OUT, blk, browser, comp, open, type RegressionTest, url } from './harness.ts';
import { openPlugin, plugPatch } from './pluginPage.ts';

export const powerTests: Record<string, RegressionTest> = {
  /** Owner (2026-11-11): the power switch, bottom centre (v1's off/on switch). Off: nothing in the world powers
   * anything (a Power block's tone stops, particles vanish) and it reads POWER OFF on red; a held block still plays;
   * Space switches it back (web). */
  async 'power-switch'(errors: string[]) {
    const p = await open(
      browser,
      [blk(1, 'ToneSource', -3, 3), blk(2, 'Power', -6, 3), blk(3, 'ParticleEmitter', 6, -4)],
      errors,
    );
    await p.evaluate(() => {
      const seen: string[] = ((window as any).__texts = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) {
        seen.push(t);
        return (f as any).call(this, t, ...a);
      };
    });
    const level = async () => {
      await p.waitForTimeout(1200);
      return p.evaluate(() => (window as any).__bd_probe.state.rms);
    };
    const where = await p.evaluate(() => {
      const a = (window as any).__bd_probe.v1App,
        pr = a.Metrics.PixelRatio;
      return [a.Width / 2 / pr, (a.Height - 47 * a.Unit) / pr];
    });
    const before = await level();
    await p.screenshot({ path: `${OUT}/power-on.png` });
    await p.mouse.move(where[0], where[1]);
    await p.mouse.click(where[0], where[1]);
    const off = await level(),
      particles = await p.evaluate(() => (window as any).__bd_probe.state.particles);
    const label = await p.evaluate(() => (window as any).__texts.includes('POWER OFF'));
    await p.screenshot({ path: `${OUT}/power-off.png` });
    const pt = await p.evaluate(() => (window as any).__bd_probe.blockPoint(1));
    await p.mouse.move(pt[0], pt[1]);
    await p.mouse.down();
    const held = await level();
    await p.mouse.up();
    await p.mouse.move(640, 200);
    await p.keyboard.press('Space');
    const back = await level(),
      on = await p.evaluate(() => (window as any).__bd_probe.scene.worldPower);
    await p.close();
    const ok =
      before > 0.01 &&
      off < 0.001 &&
      particles === 0 &&
      label &&
      held > 0.01 &&
      back > 0.01 &&
      on === true;
    return [ok, { before, off, particles, label, held, back, on }];
  },
  /** Owner (2026-11-13, CHG-0013): POWER OFF sat high in its red box. The letters are centred in it: the red above
   * and below them differs by at most one device pixel (at 1× and 2×). */
  async 'power-off-label-centred'(errors: string[]) {
    const { PNG } = await import('pngjs');
    const measure = async (dpr: number) => {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: dpr,
      });
      const p = await ctx.newPage();
      p.on('pageerror', (e) => errors.push(e.message));
      await p.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', -3, 3)])}`);
      await p.waitForFunction(() => (window as any).__bd_probe);
      await p.click('#start');
      await p.waitForTimeout(1500);
      await p.evaluate(() => (window as any).__bd_probe.scene.setWorldPower(false));
      const want = await p.evaluate(() => {
        const a = (window as any).__bd_probe.v1App,
          ctx = document.createElement('canvas').getContext('2d')!;
        ctx.fillStyle = a.Palette[13];
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      }); // the record button's red (owner, 2026-11-20)
      await p.mouse.move(640, 300);
      await p.waitForTimeout(500);
      const png = PNG.sync.read(
        await p.screenshot({ clip: { x: 560, y: 690, width: 160, height: 60 } }),
      );
      await p.screenshot({
        path: `${OUT}/power-off-label-${dpr}x.png`,
        clip: { x: 560, y: 690, width: 160, height: 60 },
      });
      await ctx.close();
      // The red box: rows whose middle column is the box's red; the text: non-red pixels inside the box's columns.
      const px = (x: number, y: number) => {
        const i = (y * png.width + x) * 4;
        return [png.data[i], png.data[i + 1], png.data[i + 2]];
      };
      const isRed = (c: number[]) => c.every((v, i) => Math.abs(v - want[i]) < 4);
      let left = -1,
        right = -1,
        top = -1,
        bottom = -1;
      for (let y = 0; y < png.height && top < 0; y++)
        for (let x = 0; x < png.width; x++)
          if (isRed(px(x, y))) {
            top = y;
            break;
          }
      if (top < 0) return null;
      for (let x = 0; x < png.width; x++)
        if (isRed(px(x, top))) {
          if (left < 0) left = x;
          right = x;
        }
      bottom = top;
      while (bottom + 1 < png.height && isRed(px(left, bottom + 1))) bottom++;
      let tTop = -1,
        tBottom = -1;
      // Text: the letters' solid pixels (cream: high green), not their anti-aliased edges.
      for (let y = top; y <= bottom; y++)
        for (let x = left; x <= right; x++)
          if (px(x, y)[1] > 150) {
            if (tTop < 0) tTop = y;
            tBottom = y;
            break;
          }
      return {
        box: [top, bottom],
        text: [tTop, tBottom],
        above: tTop - top,
        below: bottom - tBottom,
      };
    };
    const r1 = await measure(1),
      r2 = await measure(2);
    const ok =
      !!r1 && !!r2 && Math.abs(r1.above - r1.below) <= 1 && Math.abs(r2.above - r2.below) <= 1;
    return [ok, { '1x': r1, '2x': r2 }];
  },
  /** DAW plugins: the power switch has a third cell, HOST, after OFF and ON. HOST hands the power to the DAW's
   * transport (the processor ignores the page's power commands then): the label says the host is stopped (grey) or
   * playing, and the icon shows ▷ or ■. A plugin can't press the DAW's play, so HOST again only says where play is.
   * ON and OFF take the power back, the mode going to the processor before the power command. The standalone app has
   * no transport: two cells, as on the web. */
  async 'power-host-mode'(errors: string[]) {
    const { pg, close } = await openPlugin(
      plugPatch([
        { id: 'e', type: 'power.emitter', x: -3, y: 0 },
        { id: 't', type: 'source.tone', x: 3, y: 0 },
      ]),
      errors,
    );
    await pg.evaluate(() => {
      const seen: string[] = ((window as any).__texts = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) {
        seen.push(t);
        return (f as any).call(this, t, ...a);
      };
    });
    const cell = (i: number) =>
      pg.evaluate((k) => {
        const A = (window as any).__bd_probe.v1App,
          unit = A.Unit,
          pr = A.Metrics.PixelRatio,
          w = 90 * unit;
        return [(A.Width / 2 - w / 2 + (w / 3) * (k + 0.5)) / pr, (A.Height - 30 * unit) / pr];
      }, i);
    const label = async () => {
      await pg.evaluate(() => {
        (window as any).__texts.length = 0;
      });
      await pg.mouse.move(5, 5);
      await pg.mouse.move(6, 6);
      await pg.waitForTimeout(250);
      // The switch's own labels (the header's POWER menu is drawn after it).
      return pg.evaluate(
        () =>
          ((window as any).__texts as string[]).filter((t) =>
            /^(POWER|POWER OFF|POWER · HOST PLAYING|SYNCED TO HOST|USE THE HOST'S PLAY BUTTON)$/.test(
              t,
            ),
          )[0] ?? null,
      );
    }; // first: the switch draws before the header
    const sent = () =>
      pg.evaluate(() =>
        ((window as any).__sent as { id: string; v: any }[])
          .filter(
            (e) =>
              e.id === 'bd_powerMode' ||
              (e.id === 'bd_commands' && JSON.stringify(e.v).includes('"type":10')),
          )
          .map((e) =>
            e.id === 'bd_powerMode'
              ? `mode${e.v.mode}`
              : `power${e.v.commands.find((command: any) => command.type === 10).value}`,
          ),
      );
    const hostCell = await pg.evaluate(() => (window as any).__bd_probe.scene.hostPower);
    await pg.evaluate(() => {
      (window as any).__sent.length = 0;
    });
    const press = async (i: number) => {
      const [x, y] = await cell(i);
      await pg.mouse.click(x, y);
      await pg.waitForTimeout(250);
    };
    await press(2);
    const hostStopped = await label();
    const toHost = await sent();
    await pg.screenshot({
      path: `${OUT}/power-host-stopped.png`,
      clip: { x: 440, y: 690, width: 400, height: 110 },
    });
    await pg.evaluate(() => (window as any).__fire('bd_hostState', { mode: 2, playing: true }));
    const hostPlaying = await label();
    await pg.screenshot({
      path: `${OUT}/power-host-playing.png`,
      clip: { x: 440, y: 690, width: 400, height: 110 },
    });
    await pg.evaluate(() => {
      (window as any).__sent.length = 0;
    });
    await press(2);
    const hint = await pg.evaluate(() =>
      ((window as any).__texts as string[]).filter((t) => t.includes('HOST')).pop(),
    );
    const againSent = await sent();
    await pg.waitForTimeout(2800);
    const afterHint = await label();
    await press(1);
    const backOn = await sent();
    const onLabel = await label();
    await pg.evaluate(() => {
      (window as any).__sent.length = 0;
    });
    await press(0);
    const offSent = await sent();
    const offLabel = await label();
    await close();
    const app = await openPlugin(
      plugPatch([{ id: 't', type: 'source.tone', x: 0, y: 0 }]),
      errors,
      undefined,
      true,
    );
    const appCells = await app.pg.evaluate(() => (window as any).__bd_probe.scene.hostPower);
    await app.close();
    const ok =
      hostCell &&
      JSON.stringify(toHost) === '["mode2"]' &&
      hostStopped === 'SYNCED TO HOST' &&
      hostPlaying === 'POWER · HOST PLAYING' &&
      hint === "USE THE HOST'S PLAY BUTTON" &&
      againSent.length === 0 &&
      afterHint === 'POWER · HOST PLAYING' &&
      JSON.stringify(backOn) === '["mode1","power1"]' &&
      onLabel === 'POWER' &&
      JSON.stringify(offSent) === '["mode0","power0"]' &&
      offLabel === 'POWER OFF' &&
      appCells === false;
    return [
      ok,
      {
        hostCell,
        toHost,
        hostStopped,
        hostPlaying,
        hint,
        againSent,
        afterHint,
        backOn,
        onLabel,
        offSent,
        offLabel,
        appCells,
      },
    ];
  },
  /** Owner (2026-11-13, CHG-0013): a scene with two Toggles set opposite (one on, one off), saved as a share link,
   * reopened with both the same. The engine flips a Toggle when a particle hits it, but the page's patch never heard,
   * so it saved whatever was set by hand. Now the patch follows the engine (as v1's Toggle kept Params.logic): it
   * changes with each hit, the autosave keeps it, and it doesn't count as an unsaved change. */
  async 'toggle-state-saved'(errors: string[]) {
    const patch = {
      format: 'blokdust.patch',
      version: 2,
      seed: 7,
      blocks: [
        {
          id: 'e1',
          type: 'power.emitter',
          x: -10,
          y: 0,
          params: { angle: 0, selfPoweredMode: true, rate: 60 },
        },
        { id: 'on', type: 'power.toggle', x: 0, y: 0, params: { logic: true } },
        { id: 'pad', type: 'source.tone', x: 0, y: 5, params: { waveform: 3, transpose: -12 } },
        { id: 'off', type: 'power.toggle', x: 0, y: -12, params: {} },
      ],
    };
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript((pt) => {
      if (!sessionStorage.getItem('seeded')) {
        sessionStorage.setItem('seeded', '1');
        localStorage.setItem('blokdust2.autosave', pt);
      }
    }, JSON.stringify(patch));
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(`${url}/index.html`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    const logic = (id: string) =>
      p.evaluate(
        (i) =>
          (window as any).__bd_probe.state.patch.blocks.find((b: any) => b.id === i).params.logic,
        id,
      );
    const seen = new Set<string>();
    for (let t = 0; t < 6000 && seen.size < 2; t += 100) {
      seen.add(String(!!(await logic('on'))));
      await p.waitForTimeout(100);
    }
    // Freeze the world, then the patch, the panel's switch, the autosave and a reload all agree.
    await p.evaluate(() => (window as any).__bd_probe.scene.setWorldPower(false));
    await p.waitForTimeout(1600);
    const now = !!(await logic('on')),
      other = !!(await logic('off'));
    const saved = await p.evaluate(
      () =>
        JSON.parse(localStorage.getItem('blokdust2.autosave')!).blocks.find(
          (b: any) => b.id === 'on',
        ).params.logic,
    );
    await p.reload();
    await p.waitForFunction(() => (window as any).__bd_probe?.state.patch);
    const reopened = !!(await logic('on')); // before START: as saved
    await ctx.close();
    // Opened from a link (counted as saved), the flips are not unsaved changes.
    const { deflateRawSync } = await import('node:zlib');
    const token = 'p' + deflateRawSync(Buffer.from(JSON.stringify(patch))).toString('base64url');
    const q = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    q.on('pageerror', (e) => errors.push(e.message));
    await q.goto(`${url}/index.html?c=${token}`);
    await q.waitForFunction(() => (window as any).__bd_probe);
    await q.click('#start');
    await q
      .waitForFunction(
        () =>
          !(window as any).__bd_probe.state.patch.blocks.find((b: any) => b.id === 'on').params
            .logic,
        null,
        { timeout: 6000 },
      )
      .catch(() => {});
    const dirty = await q.evaluate(() =>
      (window as any).__bd_probe.scene.PatchesPanel.host.isDirty(),
    );
    await q.close();
    const r = { seen: [...seen], now, other, saved, reopened, dirty };
    return [seen.size === 2 && !!saved === now && reopened === now && !other && dirty === false, r];
  },
};
