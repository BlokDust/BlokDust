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
  sharedDevice,
  type AccountTests,
} from './harness.ts';
import type { AppSettingsPanel } from '../pageGlobals.ts';

export const statsTests: AccountTests = {
  /** R15 (CHG-0027): ACCOUNT's stats come with the one `/api/me?stats=1` it asks; favourite blocks
   * come from the tally kept on each save (older patches are counted on the way). */
  async stats() {
    const a = sharedDevice('a');
    const patch = (types: string[]) => ({
      format: 'blokdust.patch',
      version: 2,
      blocks: types.map((type, i) => ({ id: `b${i}`, type, x: i * 4, y: 0 })),
    });
    const save = (device: Device, body: Record<string, unknown>) =>
      api(device, 'POST', 'patches', { turnstile: 'ok', ...body }, { origin: base });
    // Someone else (signed out) remixes the account's first patch, twice; the account remixes
    // theirs once.
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
      parent: theirs.json?.id,
    });
    await save(a, { patch: patch(['source.tone', 'power.emitter', 'fx.reverb']), title: 'Tones' });
    // A patch from before migration 0006 (blocks not counted yet): counted when the tab next asks.
    await server.sql(`UPDATE patches SET blocks = '' WHERE id = '${mine1.json?.id}'`);
    const requests: string[] = [];
    // Account requests only: usage analytics flushes on its own 60 s timer
    // (SPEC-SHARING-USAGE-ANALYTICS), whenever.
    a.page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/') && !url.includes('/api/events'))
        requests.push(new URL(url).pathname + new URL(url).search);
    });
    await openAccount(a.page);
    await a.page.waitForFunction(
      () =>
        !!(window.__bd_probe.scene.SettingsPanel as AppSettingsPanel).accountPage.Account?.stats,
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
        st.mostRemixed?.n === 2,
      st,
    );
    const favs =
      st?.favourites.map(
        (favourite) => `${favourite.type}:${favourite.patches}:${favourite.count}`,
      ) ?? [];
    // The demo patch (the first save, with a Tone added on device B) has Tones and an Emitter: Tone
    // is in 3 patches only if the older one was counted.
    check(
      'R15: favourite blocks, in the most patches first, then the most of them (an older patch counted on the way)',
      /^source\.tone:3:\d+$/.test(favs[0] ?? '') &&
        (favs[1]?.startsWith('power.emitter:3:') ?? false) &&
        // Six: a phone shows two rows of three.
        favs.length === 6 &&
        !favs.slice(0, 5).some((favourite) => favourite.startsWith('power.laser')),
      favs,
    );
    const plain = await api(a, 'GET', 'me');
    check(
      'R15: /api/me without ?stats=1 does no stats work (loading the page)',
      !!plain.json?.user && !('stats' in plain.json.user),
      plain.json?.user,
    );
    await a.page.screenshot({ path: `${OUT}/account-stats.png` });
    await a.page.setViewportSize({ width: 390, height: 844 });
    await a.page.waitForTimeout(800);
    await a.page.screenshot({ path: `${OUT}/account-stats-phone.png` });
    await a.page.setViewportSize({ width: 1280, height: 800 });
    await a.page.waitForTimeout(500);
    await a.page.evaluate(() => {
      window.__bd_probe.scene.SettingsPanel.ClosePanel();
    });
    await a.page.waitForTimeout(700);
    await anon.ctx.close();
  },

  /** R16 (CHG-0027): running totals estimated in the page, credited with a save, and sent once
   * when the page closes; ACTIVITY_BEACON=off stops that request. */
  async activity() {
    // Rough estimates: Emitter Rate is v1 frames per particle (synced, one per Division); Laser
    // Rotate is 1/100 degree per v1 frame while powered (synced, one turn per Turn Beats).
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
    const perSecond = [
      rates({ type: 'power.emitter', params: { rate: 80 } }, true, 120).particles,
      rates({ type: 'power.emitter', params: { sync: true, division: 1 } }, true, 120).particles,
      rates({ type: 'power.emitter', params: { rate: 80 } }, false, 120).particles,
      rates({ type: 'power.laser', params: { rotate: 100 } }, true, 120).turns,
      rates({ type: 'power.laser', params: { rotate: 100 } }, false, 120).turns,
      rates({ type: 'power.laser', params: { sync: true, turnBeats: 4 } }, true, 120).turns,
    ];
    check(
      'R16: particles and turns per second from the params',
      near(perSecond[0], 0.75) &&
        near(perSecond[1], 2) &&
        perSecond[2] === 0 &&
        near(perSecond[3], 1 / 6) &&
        perSecond[4] === 0 &&
        near(perSecond[5], 0.5),
      perSecond,
    );

    const a = sharedDevice('a');
    const stats = async () => {
      const totals = (await api(a, 'GET', 'me?stats=1')).json?.user?.stats;
      if (!totals) throw new Error('no account stats');
      return totals;
    };
    const pending = () => a.page.evaluate(() => window.__bd_probe.activity);
    await openApp(a);
    await a.page.evaluate(() => {
      localStorage.removeItem('bd_activity');
    });
    const before = await stats();
    // A self-powered Emitter (a new one starts synced: 2 a second at 120 BPM), added from the menu.
    await a.page.evaluate(() => {
      const host = window.__bd_probe.scene.host,
        id = host.createBlock('ParticleEmitter', 6, 6);
      if (id !== null) host.setParam(id, 'selfPoweredMode', 1);
    });
    await a.page.waitForTimeout(3000);
    const p1 = await pending();
    check(
      'R16: the page counts time played, the block added and the particles',
      p1.blocks >= 1 && p1.playMs >= 2000 && p1.particles >= 3,
      p1,
    );
    // Every particle the engine emits counts (not an estimate from Rate): an unpowered Emitter held
    // 2 s, its particles living 10 s, so the particles on the stage are all it fired.
    await a.page.evaluate(() => {
      window.__bd_probe.scene.host.resetScene();
    });
    const held = await a.page.evaluate(() => {
      const host = window.__bd_probe.scene.host,
        id = host.createBlock('ParticleEmitter', 0, 0);
      if (id === null) throw new Error('no Emitter made');
      host.setParam(id, 'sync', 0);
      host.setParam(id, 'rate', 10);
      host.setParam(id, 'speed', 1);
      return id;
    });
    await a.page.mouse.click(40, 400);
    // A block made from the menu is held until the pointer is let go (a held Emitter fires): let
    // go, then wait until the particles already flying are gone.
    await a.page
      .waitForFunction(() => window.__bd_probe.state.particles === 0, null, {
        timeout: 20000,
      })
      .catch(() => {});
    const pt = await a.page.evaluate((id) => window.__bd_probe.blockPoint(id), held);
    if (!pt) throw new Error('the held Emitter is not on the stage');
    const emptyBefore = await a.page.evaluate(() => window.__bd_probe.state.particles);
    const beforeHold = (await pending()).particles;
    await a.page.mouse.move(pt[0], pt[1]);
    await a.page.mouse.down();
    await a.page.waitForTimeout(2000);
    await a.page.mouse.up();
    await a.page.waitForTimeout(500);
    const onStage = await a.page.evaluate(() => window.__bd_probe.state.particles);
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
    await a.page.evaluate(() => {
      window.__bd_probe.scene.PatchesPanel.ClosePanel();
    });
    await a.page.waitForTimeout(600);
    await a.page.evaluate(() => window.__bd_probe.scene.host.createBlock('ToneSource', 10, 6));
    await a.page.waitForTimeout(500);
    await a.page.goto('about:blank');
    await new Promise((res) => setTimeout(res, 1500));
    await a.page.goto(`${base}/api/config`); // back on the site (its cookie) to ask
    const closed = await stats();
    // (Playwright doesn't see a keepalive request from a page being unloaded: the account's total
    // is the evidence.)
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
          ((await post.json()) as { added?: boolean }).added === false,
        { cfg, onCfg },
      );
    } finally {
      await off.stop();
    }
    await openApp(a);
  },
};
