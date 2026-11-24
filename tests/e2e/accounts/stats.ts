// The account's stats and running activity totals (CHG-0027), run by tests/e2e/accounts.ts.
import { startLocal } from '../../../tools/server/lib.ts';
import { rates } from '../../../web/src/account/activity.ts';
import {
  OUT,
  check,
  mocks,
  server,
  base,
  type Device,
  device,
  openApp,
  pp,
  openAccount,
  api,
  saveLink,
  shared,
  type AccountTests,
} from './harness.ts';

export const statsTests: AccountTests = {
  /** R15 (CHG-0027): Settings › ACCOUNT shows the account's stats from the one `/api/me?stats=1` it already asks;
   * favourite blocks come from the tally kept on each save (and patches saved before it are counted on the way). */
  async stats() {
    const a = shared.a!;
    const patch = (types: string[]) => ({
      format: 'blokdust.patch',
      version: 2,
      blocks: types.map((type, i) => ({ id: `b${i}`, type, x: i * 4, y: 0 })),
    });
    const save = (device: Device, body: Record<string, unknown>) =>
      api(device, 'POST', 'patches', { turnstile: 'ok', ...body }, { origin: base });
    // Someone else (signed out) remixes the account's first patch, twice; the account remixes theirs once.
    const anon = await device();
    await anon.page.goto(`${base}/api/config`);
    const theirs = await save(anon, {
      patch: patch(['source.noise']),
      title: 'Theirs',
      parent: shared.firstPatch,
    });
    await save(anon, {
      patch: patch(['source.noise']),
      title: 'Theirs 2',
      parent: shared.firstPatch,
    });
    const mine1 = await save(a, {
      patch: patch(['source.tone', 'source.tone', 'power.emitter', 'power.laser']),
      title: 'Lasers',
      parent: theirs.json.id,
    });
    await save(a, { patch: patch(['source.tone', 'power.emitter', 'fx.reverb']), title: 'Tones' });
    // A patch from before migration 0006 (blocks not counted yet): counted when the tab next asks.
    await server.sql(`UPDATE patches SET blocks = '' WHERE id = '${mine1.json.id}'`);
    const requests: string[] = [];
    // Account requests only: usage analytics flushes on its own 60 s timer (SPEC-SHARING-USAGE-ANALYTICS), whenever.
    a.page.on('request', (r) => {
      if (r.url().includes('/api/') && !r.url().includes('/api/events'))
        requests.push(new URL(r.url()).pathname + new URL(r.url()).search);
    });
    await openAccount(a.page);
    await a.page.waitForFunction(
      () => !!(window as any).__bd_probe.scene.SettingsPanel.accountPage.Account?.stats,
      null,
      { timeout: 10000 },
    );
    await a.page.waitForTimeout(400);
    const st = (await pp(a.page)).account?.stats;
    check(
      'R15: opening ACCOUNT asks once, for who is signed in and the stats together',
      requests.filter((request) => request.startsWith('/api/')).length === 1 &&
        requests[0] === '/api/me?stats=1',
      requests,
    );
    check(
      'R15: patches, remixes made, remixes of the account’s patches, the most remixed',
      st?.patches === 3 &&
        st.remixes === 1 &&
        st.remixed === 2 &&
        st.mostRemixed?.id === shared.firstPatch &&
        st.mostRemixed.n === 2,
      st,
    );
    const favs = st?.favourites.map(
      (favourite: { type: string; patches: number; count: number }) =>
        `${favourite.type}:${favourite.patches}:${favourite.count}`,
    );
    // The demo patch (the first save, with a Tone added on device B) has Tones and an Emitter: Tone is in 3 patches only
    // if the older one was counted.
    check(
      'R15: favourite blocks, in the most patches first, then the most of them (an older patch counted on the way)',
      /^source\.tone:3:\d+$/.test(favs?.[0] ?? '') &&
        favs?.[1].startsWith('power.emitter:3:') &&
        favs.length === 6 &&
        !favs
          .slice(0, 5)
          .some((f: string) =>
            f.startsWith('power.laser'),
          ) /* six: a phone shows two rows of three */,
      favs,
    );
    const plain = await api(a, 'GET', 'me');
    check(
      'R15: /api/me without ?stats=1 does no stats work (loading the page)',
      plain.json.user && !('stats' in plain.json.user),
      plain.json.user,
    );
    await a.page.screenshot({ path: `${OUT}/account-stats.png` });
    await a.page.setViewportSize({ width: 390, height: 844 });
    await a.page.waitForTimeout(800);
    await a.page.screenshot({ path: `${OUT}/account-stats-phone.png` });
    await a.page.setViewportSize({ width: 1280, height: 800 });
    await a.page.waitForTimeout(500);
    await a.page.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.ClosePanel());
    await a.page.waitForTimeout(700);
    await anon.ctx.close();
  },

  /** R16 (CHG-0027): running totals estimated in the page, credited with a save, and sent once when the page closes;
   * ACTIVITY_BEACON=off stops that request. */
  async activity() {
    // The estimates (owner: rough is fine): Emitter Rate is v1 frames per particle, synced it is one per Division;
    // Laser Rotate is hundredths of a degree per v1 frame, only while powered; synced, one turn per Turn Beats.
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
    const r = [
      rates({ type: 'power.emitter', params: { rate: 80 } }, true, 120).particles,
      rates({ type: 'power.emitter', params: { sync: true, division: 1 } }, true, 120).particles,
      rates({ type: 'power.emitter', params: { rate: 80 } }, false, 120).particles,
      rates({ type: 'power.laser', params: { rotate: 100 } }, true, 120).turns,
      rates({ type: 'power.laser', params: { rotate: 100 } }, false, 120).turns,
      rates({ type: 'power.laser', params: { sync: true, turnBeats: 4 } }, true, 120).turns,
    ];
    check(
      'R16: particles and turns per second from the params',
      near(r[0], 0.75) &&
        near(r[1], 2) &&
        r[2] === 0 &&
        near(r[3], 1 / 6) &&
        r[4] === 0 &&
        near(r[5], 0.5),
      r,
    );

    const a = shared.a!;
    const stats = async () =>
      (await api(a, 'GET', 'me?stats=1')).json.user.stats as {
        blocksAdded: number;
        particles: number;
        playMs: number;
        laserTurns: number;
      };
    const pending = () =>
      a.page.evaluate(
        () =>
          (window as any).__bd_probe.activity as {
            playMs: number;
            blocks: number;
            particles: number;
            laserTurns: number;
          },
      );
    await openApp(a);
    await a.page.evaluate(() => {
      localStorage.removeItem('bd_activity');
    });
    const before = await stats();
    // A self-powered Emitter (a new one starts synced: 2 a second at 120 BPM), added from the menu.
    await a.page.evaluate(() => {
      const h = (window as any).__bd_probe.scene.host,
        id = h.createBlock('ParticleEmitter', 6, 6);
      h.setParam(id, 'selfPoweredMode', 1);
    });
    await a.page.waitForTimeout(3000);
    const p1 = await pending();
    check(
      'R16: the page counts time played, the block added and the particles',
      p1.blocks >= 1 && p1.playMs >= 2000 && p1.particles >= 3,
      p1,
    );
    // Bug (owner, 2026-11-16): the particle count was estimated from each Emitter's Rate while powered, so it didn't
    // match what was fired (presses, laser hits, keys). Now every particle the engine emits counts, exactly: an
    // unpowered Emitter held for 2 s, its particles slow enough (10 s of life) that none are gone when it is let go,
    // so the particles on the stage are all it fired.
    await a.page.evaluate(() => (window as any).__bd_probe.scene.host.resetScene());
    const held = await a.page.evaluate(() => {
      const h = (window as any).__bd_probe.scene.host,
        id = h.createBlock('ParticleEmitter', 0, 0);
      h.setParam(id, 'sync', 0);
      h.setParam(id, 'rate', 10);
      h.setParam(id, 'speed', 1);
      return id as number;
    });
    await a.page.mouse.click(40, 400);
    // A block made from the menu is held until the pointer is let go (and a held Emitter fires): let go on the empty
    // stage. Particles already flying go on until their range runs out: wait for an empty stage.
    await a.page
      .waitForFunction(() => (window as any).__bd_probe.state.particles === 0, null, {
        timeout: 20000,
      })
      .catch(() => {});
    const pt = (await a.page.evaluate((id) => (window as any).__bd_probe.blockPoint(id), held)) as [
      number,
      number,
    ];
    const emptyBefore = await a.page.evaluate(
      () => (window as any).__bd_probe.state.particles as number,
    );
    const beforeHold = (await pending()).particles;
    await a.page.mouse.move(pt[0], pt[1]);
    await a.page.mouse.down();
    await a.page.waitForTimeout(2000);
    await a.page.mouse.up();
    await a.page.waitForTimeout(500);
    const onStage = await a.page.evaluate(
      () => (window as any).__bd_probe.state.particles as number,
    );
    const counted = (await pending()).particles - beforeHold;
    check(
      'R16: every particle fired counts, exactly (an Emitter held, not powered)',
      emptyBefore === 0 && onStage > 3 && counted === onStage,
      { emptyBefore, onStage, counted },
    );
    await (async () => {
      for (let i = 0; i < 8 && !(await pp(a.page)).open; i++) {
        await a.page.mouse.move(1138, 45);
        await a.page.mouse.click(1138, 45);
        await a.page.waitForTimeout(700);
      }
    })();
    await saveLink(a.page);
    const after = await stats(),
      p2 = await pending();
    check(
      'R16: a save carries them to the account, and they stop waiting here',
      after.blocksAdded >= before.blocksAdded + 1 &&
        after.particles >= before.particles + 3 &&
        after.playMs >= before.playMs + 2000 &&
        p2.blocks === 0 &&
        p2.particles < p1.particles,
      {
        before: [before.blocksAdded, before.particles, before.playMs],
        after: [after.blocksAdded, after.particles, after.playMs],
        p2,
      },
    );
    // One more block, then the page closes: one request takes it.
    await a.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.ClosePanel());
    await a.page.waitForTimeout(600);
    await a.page.evaluate(() =>
      (window as any).__bd_probe.scene.host.createBlock('ToneSource', 10, 6),
    );
    await a.page.waitForTimeout(500);
    await a.page.goto('about:blank');
    await new Promise((res) => setTimeout(res, 1500));
    await a.page.goto(`${base}/api/config`); // back on the site (its cookie) to ask
    const closed = await stats();
    // (Playwright doesn't see a keepalive request from a page being unloaded: the account's total is the evidence.)
    check(
      'R16: closing the page sends what it counted (credited once)',
      closed.blocksAdded === after.blocksAdded + 1,
      { after: after.blocksAdded, closed: closed.blocksAdded },
    );
    // The switch: ACTIVITY_BEACON=off (a second local Worker).
    const off = await startLocal({
      name: 'accounts-beacon-off',
      vars: {
        TURNSTILE_SECRET: 'test-secret',
        TURNSTILE_VERIFY_URL: `${mocks.url}/siteverify`,
        ACTIVITY_BEACON: 'off',
      },
    });
    try {
      const cfg = (await (await fetch(`${off.url}/api/config`)).json()) as {
        activityBeacon: boolean;
      };
      const post = await fetch(`${off.url}/api/me/activity`, {
        method: 'POST',
        headers: { origin: off.url, 'content-type': 'application/json' },
        body: JSON.stringify({ blocks: 1 }),
      });
      const onCfg = (await (await fetch(`${server.url}/api/config`)).json()) as {
        activityBeacon: boolean;
      };
      check(
        'R16: ACTIVITY_BEACON=off: the page is told not to send, and the request writes nothing',
        !cfg.activityBeacon &&
          onCfg.activityBeacon &&
          post.status === 200 &&
          (await post.json()).added === false,
        { cfg, onCfg },
      );
    } finally {
      await off.stop();
    }
    await openApp(a);
  },
};
