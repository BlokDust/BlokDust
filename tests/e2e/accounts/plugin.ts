// The plugins sign in with a device code approved on the website (SHARING-0011), run by tests/e2e/accounts.ts.
import {
  OUT,
  check,
  server,
  base,
  browser,
  device,
  pp,
  press,
  openAccount,
  settled,
  googleAccount,
  api,
  saveLink,
  type AccountTests,
} from './harness.ts';

export const pluginTests: AccountTests = {
  /** SHARING-0011 (CHG-0039): a plugin signs in with a device code approved on the website, then uses its own key:
   * it reads the account and saves to it (no bot check); it can't delete the account, change its sign-in methods,
   * approve another device or list the others. The website lists it and can sign it out; it can sign itself out. */
  async 'plugin-device-code'() {
    const J = 'juce://juce.backend';
    const plug = async (method: string, path: string, body?: unknown, key?: string) => {
      const response = await fetch(`${base}/api/${path}`, {
        method,
        headers: {
          origin: J,
          'content-type': 'application/json',
          ...(key ? { authorization: `Bearer ${key}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return {
        status: response.status,
        json: (await response.json().catch(() => null)) as any,
        acao: response.headers.get('access-control-allow-origin'),
      };
    };
    // Nora: a website account (Google).
    const n = await device();
    await googleAccount(n, 'nora', 'nora_g');
    const start = await plug('POST', 'device/start', { name: 'BlokDust on Mac (Logic)\u0007' });
    const code: string = start.json?.userCode ?? '';
    check(
      'SHARING-0011: a plugin gets a code (XXXX-XXXX, no vowels), where to enter it, and its poll interval',
      start.status === 200 &&
        /^[B-DF-HJ-NP-TV-XZ2-9]{4}-[B-DF-HJ-NP-TV-XZ2-9]{4}$/.test(code) &&
        /\/link\?code=/.test(start.json.verifyUrl) &&
        start.json.interval === 5 &&
        start.acao === J,
      start.json,
    );
    const p1 = await plug('POST', 'device/poll', { deviceCode: start.json.deviceCode });
    const p2 = await plug('POST', 'device/poll', { deviceCode: start.json.deviceCode });
    check(
      '… pending until approved; polling faster than the interval is refused',
      p1.status === 202 &&
        p1.json.status === 'pending' &&
        p2.status === 429 &&
        p2.json.status === 'slow_down',
      [p1, p2],
    );
    const anon = await fetch(`${base}/api/device/code?code=${code}`);
    const info = await api(n, 'GET', `device/code?code=${code.toLowerCase().replace('-', '')}`);
    check(
      '… the website shows what asks (signed in only; the code read loosely)',
      anon.status === 401 && info.status === 200 && info.json.name === 'BlokDust on Mac (Logic)',
      { anon: anon.status, info },
    );
    const cross = await fetch(`${base}/api/device/approve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, approve: true }),
    });
    const ok = await api(n, 'POST', 'device/approve', { code, approve: true });
    check(
      "… approving needs this site's Origin; signed in, it approves",
      cross.status === 403 && ok.status === 200 && ok.json.approved === true,
      { cross: cross.status, ok },
    );
    await new Promise((resolve) => setTimeout(resolve, 4200));
    const got = await plug('POST', 'device/poll', { deviceCode: start.json.deviceCode });
    const again = await plug('POST', 'device/poll', { deviceCode: start.json.deviceCode });
    const key: string = got.json?.key ?? '';
    check(
      '… the next poll takes the key, once',
      got.status === 200 &&
        /^bdk_[A-Za-z0-9_-]{40,}$/.test(key) &&
        got.json.user.handle === 'nora_g' &&
        again.status === 410,
      { got: { ...got.json, key: key.slice(0, 6) }, again },
    );
    // The key: the account, its patches, saving (no bot check), opening as its owner.
    const me = await plug('GET', 'me?stats=1', undefined, key);
    const saved = await plug(
      'POST',
      'patches',
      {
        patch: {
          format: 'blokdust.patch',
          version: 2,
          seed: 1,
          blocks: [{ id: 'a', type: 'source.tone', x: 0, y: 0 }],
        },
        title: 'From Logic',
      },
      key,
    );
    const mine = await plug('GET', 'me/patches', undefined, key);
    const over = await plug(
      'PUT',
      `patches/${saved.json?.id}`,
      {
        patch: { format: 'blokdust.patch', version: 2, seed: 1, blocks: [] },
        title: 'From Logic 2',
      },
      key,
    );
    const opened = await plug('GET', `patches/${saved.json?.id}`, undefined, key);
    check(
      'SHARING-0011: with its key a plugin reads the account and saves to it (no bot check) and over it',
      me.status === 200 &&
        me.json.user?.handle === 'nora_g' &&
        !!me.json.user.stats &&
        saved.status === 201 &&
        mine.json?.patches?.some((x: any) => x.id === saved.json.id) &&
        over.status === 200 &&
        opened.json?.mine === true,
      { me: me.status, saved: saved.status, over: over.status, mine: opened.json?.mine },
    );
    const noBot = await plug(
      'POST',
      'patches',
      { patch: { format: 'blokdust.patch', version: 2, seed: 1, blocks: [] }, title: 'x' },
      'bdk_' + 'A'.repeat(43),
    );
    check(
      '… a wrong key gets no free pass (the bot check is asked for)',
      noBot.status === 400 || noBot.status === 403,
      noBot,
    );
    const del = await plug('DELETE', 'me', undefined, key),
      meth = await plug('DELETE', 'me/methods', { kind: 'google' }, key);
    const apps = await plug('GET', 'me/apps', undefined, key),
      appr = await plug('POST', 'device/approve', { code: 'BCDF-GHJK', approve: true }, key);
    check(
      "SHARING-0011: a key can't delete the account, change sign-in methods, list apps or approve a device",
      [del, meth, apps, appr].every((r) => r.status === 401 || r.status === 403) &&
        (await plug('GET', 'me', undefined, key)).json?.user?.handle === 'nora_g',
      [del.status, meth.status, apps.status, appr.status],
    );
    // The website lists it, and signs it out.
    const listed = await api(n, 'GET', 'me/apps');
    const app = listed.json?.apps?.find((x: any) => x.name === 'BlokDust on Mac (Logic)');
    check(
      'SHARING-0011: the website lists the plugin (its name cleaned)',
      listed.status === 200 && !!app && !!app.lastUsed,
      listed.json,
    );
    const out = await api(n, 'DELETE', 'me/apps', { id: app?.id });
    const after = await plug('GET', 'me', undefined, key);
    check(
      '… and signs it out: the key reads nobody',
      out.status === 200 && after.status === 200 && after.json.user === null,
      { out, after: after.json },
    );
    // A second plugin signs itself out; a third is turned away; an expired code.
    const s2 = await plug('POST', 'device/start', { name: 'BlokDust on iPad' });
    await api(n, 'POST', 'device/approve', { code: s2.json.userCode, approve: true });
    const k2 = (await plug('POST', 'device/poll', { deviceCode: s2.json.deviceCode })).json?.key;
    const so = await plug('POST', 'auth/logout', {}, k2);
    check(
      'SHARING-0011: a plugin signs itself out (its key goes)',
      !!k2 && so.status === 200 && (await plug('GET', 'me', undefined, k2)).json.user === null,
      so,
    );
    const s3 = await plug('POST', 'device/start', { name: 'Someone else' });
    await api(n, 'POST', 'device/approve', { code: s3.json.userCode, approve: false });
    const denied = await plug('POST', 'device/poll', { deviceCode: s3.json.deviceCode });
    const s4 = await plug('POST', 'device/start', { name: 'Late' });
    await server.sql('UPDATE device_codes SET expires = 0');
    const late = await plug('POST', 'device/poll', { deviceCode: s4.json.deviceCode });
    const lateApprove = await api(n, 'POST', 'device/approve', {
      code: s4.json.userCode,
      approve: true,
    });
    check(
      '… CANCEL turns a plugin away; a code expires after 10 minutes',
      denied.status === 403 && late.status === 410 && lateApprove.status === 404,
      { denied, late, lateApprove },
    );
    const link = await fetch(`${base}/link?code=${code}`, { redirect: 'manual' });
    check(
      'SHARING-0011: /link?code= opens the app at the code',
      link.status === 302 &&
        new URL(link.headers.get('location')!).searchParams.get('link') === code,
      link.headers.get('location'),
    );
    await n.ctx.close();
  },
  /** SHARING-0011 (CHG-0039) through the apps: the plugin's SIGN IN shows a code and opens the website at it; signed
   * in there, the website asks and APPROVE signs the plugin in; the plugin keeps its key, lists the account's patches
   * in OPEN and saves to the account; the website lists it under SIGN-IN METHODS; SIGN OUT drops the key. */
  async 'plugin-sign-in'() {
    const w = await device();
    await googleAccount(w, 'pia', 'pia_g');
    // The plugin's page (a fake JUCE backend; its server is this one).
    const pctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await pctx.addInitScript(
      ([site]) => {
        const listeners: Record<string, ((x: unknown) => void)[]> = {},
          sent: { id: string; v: any }[] = [];
        (window as any).__sent = sent;
        (window as any).__bd_pluginSite = site;
        (window as any).__JUCE__ = {
          backend: {
            addEventListener: (id: string, fn: (x: unknown) => void) => {
              (listeners[id] ??= []).push(fn);
            },
            emitEvent: (id: string, v: unknown) => {
              sent.push({ id, v });
              // The patch files' folder: empty (the real plugin answers with its files).
              if (id === 'bd_patchList')
                setTimeout(() => {
                  listeners.bd_patchList?.forEach((f) => {
                    f({ req: (v as { req: number }).req, items: [] });
                  });
                }, 10);
              if (id === 'bd_hello')
                setTimeout(() => {
                  listeners.bd_patch?.forEach((f) => {
                    f({
                      patch: JSON.stringify({
                        format: 'blokdust.patch',
                        version: 2,
                        seed: 1,
                        blocks: [{ id: 't', type: 'source.tone', x: 0, y: 0, params: {} }],
                      }),
                      ids: { t: 1 },
                    });
                  });
                  listeners.bd_account?.forEach((f) => {
                    f({ name: 'BlokDust on Mac (Logic Pro)', browser: true });
                  });
                }, 50);
            },
          },
        };
      },
      [`${base}/`] as const,
    );
    const pg = await pctx.newPage();
    pg.on('pageerror', (e) => {
      console.error(`  plugin page error: ${e.message}`);
    });
    await pg.goto(`${base}/index.html`);
    await pg.waitForFunction(() => (window as any).__bd_probe?.state.started, null, {
      timeout: 20000,
    });
    await pg.waitForTimeout(1200);
    await openAccount(pg);
    const ways = await pg.evaluate(() =>
      ['browser', 'passkey', 'google'].map(
        (k) => !!(window as any).__bd_probe.scene.SettingsPanel.accountCentre(k),
      ),
    );
    const tab = await pg.evaluate(
      () => (window as any).__bd_probe.scene.SettingsPanel.MenuItems[3]?.Name,
    );
    check(
      "SHARING-0011: the plugin's Settings has SIGN IN (after ABOUT), with SIGN IN WITH YOUR BROWSER only",
      JSON.stringify(ways) === '[true,false,false]' && /sign in/i.test(tab ?? ''),
      { ways, tab },
    );
    await press(pg, 'browser', 800);
    await pg
      .waitForFunction(
        () => (window as any).__bd_probe.scene.SettingsPanel.accountPage.View === 'code',
        null,
        { timeout: 10000 },
      )
      .catch(() => {});
    const opened = await pg.evaluate(
      () =>
        ((window as any).__sent as { id: string; v: any }[])
          .filter((e) => e.id === 'bd_openUrl')
          .map((e) => e.v.url)
          .pop() as string | undefined,
    );
    const shown = await pg.evaluate(
      () =>
        (window as any).__bd_probe.scene.SettingsPanel.accountPage.Device?.userCode as
          string | undefined,
    );
    await pg.mouse.move(5, 5);
    await pg.waitForTimeout(200);
    await pg.screenshot({ path: `${OUT}/plugin-code.png` });
    check(
      '… it shows a code and a QR code, and opens the website at it',
      !!shown && !!opened && opened.includes(`/link?code=${shown}`),
      { shown, opened },
    );
    // The website at that address: signed in, it asks.
    await w.page.goto(opened!.replace('127.0.0.1', 'localhost'));
    await w.page
      .waitForFunction(
        () => {
          const settingsPanel = (window as any).__bd_probe?.scene.SettingsPanel;
          return (
            settingsPanel?.OffsetY === 0 &&
            settingsPanel.accountPage.View === 'approve' &&
            !!settingsPanel.accountPage.ApproveName
          );
        },
        null,
        { timeout: 20000 },
      )
      .catch(() => {});
    await w.page.waitForTimeout(500);
    const asks = await w.page.evaluate(() => {
      const x = (window as any).__bd_probe.scene.SettingsPanel.accountPage;
      return { view: x.View, code: x.ApproveCode, name: x.ApproveName };
    });
    await w.page.mouse.move(5, 5);
    await w.page.waitForTimeout(200);
    await w.page.screenshot({ path: `${OUT}/website-approve.png` });
    check(
      '… the website asks: which device, the same code, CANCEL · APPROVE',
      asks.view === 'approve' &&
        asks.code?.toUpperCase() === shown &&
        asks.name === 'BlokDust on Mac (Logic Pro)',
      asks,
    );
    await press(w.page, 'approveOk');
    await settled(w.page);
    const said = (await pp(w.page)).message;
    await pg
      .waitForFunction(
        () =>
          (window as any).__bd_probe.scene.SettingsPanel.accountPage.Account?.handle === 'pia_g',
        null,
        { timeout: 20000 },
      )
      .catch(() => {});
    const kept = await pg.evaluate(() =>
      ((window as any).__sent as { id: string; v: any }[])
        .filter((e) => e.id === 'bd_accountSave')
        .map((e) => e.v)
        .pop(),
    );
    await pg.waitForTimeout(900);
    const inPlugin = await pg.evaluate(() => {
      const settingsPanel = (window as any).__bd_probe.scene.SettingsPanel,
        x = settingsPanel.accountPage;
      return {
        handle: x.Account?.handle,
        view: x.View,
        message: x.Message,
        settings: settingsPanel.Open,
        me: (window as any).__bd_probe.corners?.me,
      };
    });
    await pg.waitForTimeout(600);
    await pg.mouse.move(5, 5);
    await pg.waitForTimeout(200);
    await pg.screenshot({ path: `${OUT}/plugin-signed-in.png` });
    check(
      '… APPROVE signs the plugin in: it keeps its key (bd_accountSave) and goes back to the stage, no message (owner, 2026-11-19)',
      /is signed in/.test(said) &&
        inPlugin.handle === 'pia_g' &&
        !inPlugin.settings &&
        inPlugin.message === '' &&
        inPlugin.me === 'pia_g' &&
        (kept?.key ?? '').startsWith('bdk_') &&
        kept?.handle === 'pia_g',
      { said, inPlugin, kept: kept && { ...kept, key: String(kept.key).slice(0, 6) } },
    );
    await openAccount(pg);
    const pluginControls = await pg.evaluate(() =>
      ['signOut', 'deleteAccount', 'methods', 'website'].map(
        (k) => !!(window as any).__bd_probe.scene.SettingsPanel.accountCentre(k),
      ),
    );
    check(
      '… signed in, the plugin has SIGN OUT only (no SIGN-IN METHODS, DELETE ACCOUNT or ON THE WEBSITE)',
      JSON.stringify(pluginControls) === '[true,false,false,false]',
      pluginControls,
    );
    // SAVE in the plugin saves to the account (no bot check), and OPEN lists the account's patches.
    await pg.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.ClosePanel());
    await pg.waitForTimeout(800);
    await pg.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.OpenPanel(0));
    await pg.waitForTimeout(1200);
    const id = await saveLink(pg);
    const theirs = await api(w, 'GET', 'me/patches');
    const listed = await pg.evaluate(async () =>
      ((await (window as any).__bd_probe.scene.host.listPatches()) as { key: string }[]).map(
        (i) => i.key,
      ),
    );
    check(
      "… SAVE in the plugin saves to the account, and OPEN lists the account's patches",
      theirs.json?.patches?.some((x: any) => x.id === id) && listed.includes(`acct:${id}`),
      { id, listed: listed.slice(0, 4) },
    );
    // The website lists it under SIGN-IN METHODS; SIGN OUT in the plugin drops its key.
    await w.page.evaluate(() =>
      (window as any).__bd_probe.scene.SettingsPanel.accountPage.showMethods(''),
    );
    await w.page.waitForTimeout(800);
    const apps = await w.page.evaluate(() =>
      ((window as any).__bd_probe.scene.SettingsPanel.accountPage.Apps as { name: string }[]).map(
        (a) => a.name,
      ),
    );
    await w.page.mouse.move(5, 5);
    await w.page.waitForTimeout(200);
    await w.page.screenshot({ path: `${OUT}/website-apps.png` });
    check(
      'SHARING-0011: SIGN-IN METHODS lists the plugin signed in',
      apps.includes('BlokDust on Mac (Logic Pro)'),
      apps,
    );
    await openAccount(pg);
    await press(pg, 'signOut');
    await pg.waitForTimeout(1000);
    const cleared = await pg.evaluate(() =>
      ((window as any).__sent as { id: string }[]).some((e) => e.id === 'bd_accountClear'),
    );
    const after = (await fetch(`${base}/api/me`, {
      headers: { authorization: `Bearer ${kept?.key}` },
    }).then((response) => response.json())) as any;
    check(
      '… SIGN OUT in the plugin forgets its key here and on the server',
      cleared &&
        after.user === null &&
        (await pg.evaluate(
          () => (window as any).__bd_probe.scene.SettingsPanel.accountPage.Account,
        )) === null,
      { cleared, after: after.user },
    );
    await pctx.close();
    await w.ctx.close();
  },
};
