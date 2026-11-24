// pnpm test:sharing — CHG-0003 acceptance (SPEC-SHARING-BACKEND), black-box through the real app and the Worker:
//   local (default): `wrangler dev` on web/dist with a local D1, Cloudflare's test Turnstile key, and mocked Freesound +
//   siteverify (tests/e2e/mock-services.ts), so every run is the same.
//   --remote <url>: the same flow against a deployed Worker (`pnpm bd server smoke`): real Turnstile and Freesound;
//   checks that need the mocks are skipped there, and patches it creates are deleted at the end.
import { chromium } from 'playwright';
import { startLocal, type LocalServer } from '../../tools/server/lib.ts';
import { startMockServices } from './mock-services.ts';
import {
  api,
  base,
  based,
  check,
  created,
  mocks,
  only,
  realChrome,
  remote,
  results,
  setTarget,
  type SharingTests,
} from './sharing/harness.ts';
import { hostingTests } from './sharing/hosting.ts';
import { apiGuardTests } from './sharing/apiGuards.ts';
import { savingTests } from './sharing/saving.ts';
import { shareLinkTests } from './sharing/shareLinks.ts';
import { embedTests } from './sharing/embed.ts';
import { sampleTests } from './sharing/samples.ts';
import { newTabTests } from './sharing/newTab.ts';

const tests: SharingTests = {
  ...hostingTests,
  ...apiGuardTests,
  ...savingTests,
  ...shareLinkTests,
  ...embedTests,
  ...sampleTests,
  ...newTabTests,
};

async function main() {
  let server: LocalServer | null = null;
  const services = await startMockServices(); // remote runs only use its third-party host page
  if (remote) setTarget(remote.replace(/\/+$/, ''), services);
  else {
    server = await startLocal({
      name: 'test',
      vars: {
        TURNSTILE_SECRET: 'test-secret',
        TURNSTILE_VERIFY_URL: `${services.url}/siteverify`,
        FREESOUND_TOKEN: 'test-freesound-key',
        FREESOUND_API: `${services.url}/apiv2`,
      },
      env: based ? 'based' : undefined,
    });
    setTarget(server.url + (based ? '/blokdust' : ''), services);
  }
  console.error(`sharing tests against ${base}${remote ? ' (remote)' : ''}`);
  const real = remote ? await realChrome() : null;
  const browser = real ? real.browser : await chromium.launch();
  try {
    for (const [name, fn] of Object.entries(tests)) {
      if (only && !only.includes(name)) continue;
      console.error(`— ${name}`);
      try {
        await fn(browser);
      } catch (error) {
        check(`${name} threw`, false, String(error));
      }
    }
  } finally {
    await browser.close();
    real?.close();
    for (const c of created)
      await api('DELETE', `patches/${c.id}`, undefined, c.token).catch(() => {});
    if (server) await server.stop();
    mocks?.close();
  }
  const failed = results.filter((result) => !result.ok);
  console.log(
    JSON.stringify({
      base,
      checks: results.length,
      passed: results.length - failed.length,
      failed: failed.map((f) => f.name),
    }),
  );
  process.exitCode = failed.length ? 1 : 0;
}
void main();
