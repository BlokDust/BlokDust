// The new-account limit per network and the cross-site guard, run by tests/e2e/accounts.ts.
import { startLocal } from '../../../tools/server/lib.ts';
import {
  OUT,
  check,
  mocks,
  server,
  base,
  device,
  pp,
  api,
  shared,
  type AccountTests,
} from './harness.ts';

export const guardTests: AccountTests = {
  /** R1b (CHG-0035): a network makes ACCOUNTS_PER_DAY new accounts a day (a second local Worker, 2 a day); the next
   * is refused, by passkey and by Google; known accounts still sign in; back from Google the app says why. */
  async 'new-account-limit'() {
    const vars = {
      TURNSTILE_SECRET: 'test-secret',
      TURNSTILE_VERIFY_URL: `${mocks.url}/siteverify`,
      ACCOUNTS_PER_DAY: '2',
      GOOGLE_CLIENT_ID: 'test-google-client',
      GOOGLE_CLIENT_SECRET: 'test-google-secret',
      GOOGLE_AUTH_URL: `${mocks.url}/google/auth`,
      GOOGLE_TOKEN_URL: `${mocks.url}/google/token`,
    };
    const lim = await startLocal({ name: 'accounts-limit', vars });
    try {
      // Google sign-in by hand: start (its cookie), the mock's consent, the callback; where it lands.
      const googleAs = async (user: string): Promise<string> => {
        await fetch(`${mocks.url}/google/next?user=${user}`);
        const start = await fetch(`${lim.url}/api/auth/google/start?return=%2F`, {
          redirect: 'manual',
        });
        const jar = start.headers
          .getSetCookie()
          .map((x) => x.split(';')[0])
          .join('; ');
        const callback = (
          await fetch(start.headers.get('location')!, { redirect: 'manual' })
        ).headers.get('location')!;
        return (
          new URL(
            (await fetch(callback, { redirect: 'manual', headers: { cookie: jar } })).headers.get(
              'location',
            ) ?? '',
            lim.url,
          ).searchParams.get('account') ?? ''
        );
      };
      const landed = [await googleAs('lim_1'), await googleAs('lim_2'), await googleAs('lim_3')];
      const known = await googleAs('lim_1');
      const passkey = await fetch(`${lim.url}/api/auth/passkey/register/options`, {
        method: 'POST',
        headers: { origin: lim.url, 'content-type': 'application/json' },
        body: JSON.stringify({ handle: 'lim_four', turnstile: 'ok' }),
      });
      const why = (await passkey.json()) as { error?: string };
      check(
        'R1b: two new accounts, then the third is refused (Google); a known account still signs in',
        landed.join(',') === 'new,new,limit' && known === 'in',
        { landed, known },
      );
      check(
        'R1b: a new passkey account is refused before the device makes a passkey, saying why',
        passkey.status === 429 &&
          /^Cannot create any more new accounts today\.$/.test(why.error ?? ''),
        { status: passkey.status, why },
      );
    } finally {
      await lim.stop();
    }
    // Back from Google refused: Settings › SIGN IN, saying why.
    const f = await device();
    await f.page.goto(`${base}/?account=limit`);
    await f.page
      .waitForFunction(
        () => {
          const settingsPanel = (window as any).__bd_probe?.scene?.SettingsPanel;
          return (
            settingsPanel?.Open &&
            settingsPanel.OffsetY === 0 &&
            settingsPanel.accountPage.Account !== undefined
          );
        },
        null,
        { timeout: 20000 },
      )
      .catch(() => {});
    await f.page.waitForTimeout(400);
    const st = await pp(f.page);
    check(
      'R1b: back from Google refused, Settings › SIGN IN says why',
      st.settings &&
        st.account === null &&
        st.message === 'Cannot create any more new accounts today.',
      st,
    );
    await f.page.screenshot({ path: `${OUT}/new-account-limit.png` });
    await f.ctx.close();
  },

  /** R5: cookie-authenticated changes only from this site. */
  async 'cross-site'() {
    const a = shared.a!;
    const cookie = (await a.ctx.cookies()).find((c) => c.name === 'bd_session')!;
    const evil = await fetch(`${server.url}/api/auth/logout`, {
      method: 'POST',
      headers: {
        cookie: `bd_session=${cookie.value}`,
        origin: 'https://evil.example',
        'content-type': 'application/json',
      },
      body: '{}',
    });
    const none = await fetch(`${server.url}/api/me`, {
      method: 'DELETE',
      headers: { cookie: `bd_session=${cookie.value}` },
    });
    const still = await api(a, 'GET', 'me');
    check(
      'R5: another site (or no Origin) cannot sign out or delete with the cookie',
      evil.status === 403 && none.status === 403 && still.json.user?.handle === 'tester_1',
      [evil.status, none.status],
    );
  },
};
