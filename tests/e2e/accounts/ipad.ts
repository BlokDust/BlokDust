// The iPad app signs in natively (SHARING-0011), run by tests/e2e/accounts.ts.
import {
  OUT,
  check,
  mocks,
  base,
  browser,
  device,
  openApp,
  press,
  openAccount,
  settled,
  corners,
  type AccountTests,
} from './harness.ts';

export const ipadTests: AccountTests = {
  /** SHARING-0011: the iPad app signs in natively. Sign in with Apple: a nonce from the server, Apple's code exchanged
   * with the app's id, the token's nonce checked, once; the same Apple account as on the website. Passkeys: the site's
   * passkey answers a challenge kept by id (no cookie). Either way the app gets a key. The site publishes its
   * apple-app-site-association for the app. */
  async 'ipad-native'() {
    const J = 'juce://juce.backend';
    const app = async (path: string, body?: unknown, key?: string, method = 'POST') => {
      const response = await fetch(`${base}/api/${path}`, {
        method,
        headers: {
          origin: J,
          'content-type': 'application/json',
          ...(key ? { authorization: `Bearer ${key}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, json: (await response.json().catch(() => null)) as any };
    };
    const aasa = await fetch(`${base}/.well-known/apple-app-site-association`).then(
      async (response) => ({
        status: response.status,
        type: response.headers.get('content-type'),
        json: await response.json().catch(() => null),
      }),
    );
    check(
      'SHARING-0011: the site publishes apple-app-site-association for the app (webcredentials)',
      aasa.status === 200 &&
        (aasa.type ?? '').includes('json') &&
        aasa.json?.webcredentials?.apps?.[0] === 'test-team.test.app.id',
      aasa,
    );
    const n1 = await app('app/apple/nonce');
    const a1 = await app('app/apple', {
      id: n1.json.id,
      code: `ivy~${n1.json.nonce}`,
      name: 'BlokDust on iPad',
    });
    const named = await app('me/handle', { handle: 'ivy_a' }, a1.json?.key, 'PUT');
    const again = await app('app/apple', {
      id: n1.json.id,
      code: `ivy~${n1.json.nonce}`,
      name: 'BlokDust on iPad',
    });
    const n2 = await app('app/apple/nonce');
    const wrong = await app('app/apple', { id: n2.json.id, code: 'ivy~not-the-nonce', name: 'x' });
    const n3 = await app('app/apple/nonce');
    const a3 = await app('app/apple', {
      id: n3.json.id,
      code: `ivy~${n3.json.nonce}`,
      name: 'BlokDust on iPad',
    });
    check(
      'SHARING-0011: Sign in with Apple in the app makes the account and a key; it names itself there; a nonce works once and must match',
      a1.status === 200 &&
        (a1.json?.key ?? '').startsWith('bdk_') &&
        a1.json.fresh === true &&
        named.status === 200 &&
        again.status === 400 &&
        wrong.status === 401 &&
        a3.status === 200 &&
        a3.json.fresh === false &&
        a3.json.user.handle === 'ivy_a',
      {
        a1: a1.status,
        fresh: a1.json?.fresh,
        named: named.status,
        again: again.status,
        wrong: wrong.status,
        a3: a3.json && { ...a3.json, key: undefined },
      },
    );
    // The same Apple account on the website: the same BlokDust account.
    const web = await device();
    await fetch(`${mocks.url}/google/next?user=ivy`);
    await openApp(web);
    await openAccount(web.page);
    await Promise.all([
      web.page.waitForURL(/account=/, { timeout: 20000 }).catch(() => {}),
      press(web.page, 'apple', 0),
    ]);
    await web.page
      .waitForFunction(() => (window as any).__bd_probe?.corners?.me === 'ivy_a', null, {
        timeout: 20000,
      })
      .catch(() => {});
    check(
      "… and the website's Apple sign-in reaches the same account",
      (await corners(web.page)).me === 'ivy_a',
      await corners(web.page),
    );
    await web.ctx.close();
    // Passkeys: a website account's passkey answers the app's challenge.
    const k = await device();
    await openApp(k);
    await openAccount(k.page);
    await press(k.page, 'passkey');
    await k.page.waitForFunction(
      () => (window as any).__bd_probe.scene.SettingsPanel.accountPage.View === 'create',
      null,
      { timeout: 10000 },
    );
    await k.page.fill('#accountHandleInput', 'kit_p');
    await press(k.page, 'submit');
    await settled(k.page);
    const viaPasskey = await k.page.evaluate(async (b) => {
      const post = (path: string, body: unknown) =>
        fetch(`${b}/api/${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }).then(async (response) => ({ status: response.status, json: await response.json() }));
      const o = await post('app/passkey/options', {});
      const dec = (s: string) =>
        Uint8Array.from(
          atob(
            s
              .replace(/-/g, '+')
              .replace(/_/g, '/')
              .padEnd(Math.ceil(s.length / 4) * 4, '='),
          ),
          (c) => c.charCodeAt(0),
        );
      const enc = (buf: ArrayBuffer) =>
        btoa(String.fromCharCode(...new Uint8Array(buf)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
      const cred = (await navigator.credentials.get({
        publicKey: {
          challenge: dec(o.json.options.challenge),
          rpId: o.json.rpId,
          userVerification: 'preferred',
        },
      })) as PublicKeyCredential;
      const r = cred.response as AuthenticatorAssertionResponse;
      const response = {
        id: cred.id,
        rawId: enc(cred.rawId),
        type: 'public-key',
        clientExtensionResults: {},
        authenticatorAttachment: 'platform',
        response: {
          clientDataJSON: enc(r.clientDataJSON),
          authenticatorData: enc(r.authenticatorData),
          signature: enc(r.signature),
          userHandle: r.userHandle ? enc(r.userHandle) : undefined,
        },
      };
      const done = await post('app/passkey', { id: o.json.id, response, name: 'BlokDust on iPad' });
      const replay = await post('app/passkey', {
        id: o.json.id,
        response,
        name: 'BlokDust on iPad',
      });
      return {
        rp: o.json.rpId,
        status: done.status,
        key: String(done.json.key ?? '').slice(0, 4),
        handle: done.json.user?.handle,
        replay: replay.status,
      };
    }, base);
    check(
      "SHARING-0011: a passkey answers the app's challenge (kept by id, once) and the app gets a key",
      viaPasskey.status === 200 &&
        viaPasskey.key === 'bdk_' &&
        viaPasskey.handle === 'kit_p' &&
        viaPasskey.replay === 400,
      viaPasskey,
    );
    await k.ctx.close();
  },
  /** SHARING-0011: the iPad app's SIGN IN offers Apple and a passkey natively (and the code); Apple's answer (here
   * the fake system sheet's) becomes the app's key, and a new account names itself in the app. */
  async 'ipad-app-sign-in'() {
    const pctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await pctx.addInitScript(
      ([site]) => {
        const listeners: Record<string, ((x: unknown) => void)[]> = {},
          sent: { id: string; v: any }[] = [];
        (window as any).__sent = sent;
        (window as any).__bd_pluginSite = site;
        const fire = (id: string, v: unknown) =>
          setTimeout(() => {
            listeners[id]?.forEach((f) => {
              f(v);
            });
          }, 20);
        (window as any).__JUCE__ = {
          backend: {
            addEventListener: (id: string, fn: (x: unknown) => void) => {
              (listeners[id] ??= []).push(fn);
            },
            emitEvent: (id: string, v: any) => {
              sent.push({ id, v });
              if (id === 'bd_patchList') fire('bd_patchList', { req: v.req, items: [] });
              // The system's Apple sheet: Apple's code (the mock reads the user and the nonce from it).
              if (id === 'bd_nativeApple') fire('bd_nativeAppleDone', { code: `zed~${v.nonce}` });
              if (id === 'bd_hello') {
                fire('bd_patch', {
                  patch: JSON.stringify({
                    format: 'blokdust.patch',
                    version: 2,
                    seed: 1,
                    blocks: [],
                  }),
                  ids: {},
                  ios: true,
                  standalone: true,
                });
                fire('bd_account', { name: 'BlokDust on iPad', browser: true, native: true });
              }
            },
          },
        };
      },
      [`${base}/`] as const,
    );
    const pg = await pctx.newPage();
    pg.on('pageerror', (e) => {
      console.error(`  ipad page error: ${e.message}`);
    });
    await pg.goto(`${base}/index.html`);
    await pg.waitForFunction(() => (window as any).__bd_probe?.state.started, null, {
      timeout: 20000,
    });
    await pg.waitForTimeout(1200);
    await openAccount(pg);
    const ways = await pg.evaluate(() =>
      ['apple', 'passkey', 'browser', 'google'].map(
        (k) => !!(window as any).__bd_probe.scene.SettingsPanel.accountCentre(k),
      ),
    );
    await pg.mouse.move(5, 5);
    await pg.waitForTimeout(200);
    await pg.screenshot({ path: `${OUT}/ipad-sign-in.png` });
    // The app's sign-in shares a per-minute limit with the plugins' codes (the tests before used it): refused, wait it out.
    for (let attempt = 0; attempt < 2; attempt++) {
      await press(pg, 'apple', 300);
      await pg
        .waitForFunction(
          () => {
            const x = (window as any).__bd_probe.scene.SettingsPanel.accountPage;
            return x.View === 'name' || (!x.Busy && !!x.Message);
          },
          null,
          { timeout: 15000 },
        )
        .catch(() => {});
      if (
        !/too many requests/.test(
          await pg.evaluate(
            () => (window as any).__bd_probe.scene.SettingsPanel.accountPage.Message,
          ),
        )
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, 61_000));
    }
    const kept = await pg.evaluate(() =>
      ((window as any).__sent as { id: string; v: any }[])
        .filter((e) => e.id === 'bd_accountSave')
        .map((e) => e.v)
        .pop(),
    );
    await pg.waitForTimeout(800);
    await pg.fill('#accountHandleInput', 'zed_a');
    await press(pg, 'submit');
    await settled(pg);
    const after = await pg.evaluate(
      () => (window as any).__bd_probe.scene.SettingsPanel.accountPage.Account?.handle,
    );
    check(
      'SHARING-0011: the iPad app offers SIGN IN WITH APPLE, SIGN IN WITH PASSKEY and the code; Apple gives it a key and a new account names itself there',
      JSON.stringify(ways) === '[true,true,true,false]' &&
        (kept?.key ?? '').startsWith('bdk_') &&
        after === 'zed_a',
      { ways, kept: kept && String(kept.key).slice(0, 4), after },
    );
    await pctx.close();
  },
};
