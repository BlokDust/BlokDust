// pnpm test:sharing [--base] [--remote <url>] — CHG-0003 (SPEC-SHARING-BACKEND) on a local Worker
// with mocked Turnstile and Freesound, or on a deployed one (`bd server smoke`, mocks skipped).
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
    for (const patch of created)
      await api('DELETE', `patches/${patch.id}`, undefined, patch.token).catch(() => {});
    if (server) await server.stop();
    mocks?.close();
  }
  const failed = results.filter((result) => !result.ok);
  console.log(
    JSON.stringify({
      base,
      checks: results.length,
      passed: results.length - failed.length,
      failed: failed.map((result) => result.name),
    }),
  );
  process.exitCode = failed.length ? 1 : 0;
}
void main();
