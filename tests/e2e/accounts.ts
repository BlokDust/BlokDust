// pnpm test:accounts — CHG-0023 acceptance (SPEC-SHARING-ACCOUNTS), black-box through the real app and the Worker:
// `wrangler dev` on web/dist with a local D1, Cloudflare's test Turnstile key, siteverify and Google mocked
// (tests/e2e/mock-services.ts), and Chrome's virtual WebAuthn authenticator standing in for a phone or laptop.
// The app is opened on http://localhost:<port>: passkeys need a domain, not an IP address.
import { writeFileSync } from 'node:fs';
import {
  OUT,
  browser,
  check,
  mocks,
  only,
  results,
  server,
  type AccountTests,
} from './accounts/harness.ts';
import { passkeyTests } from './accounts/passkeys.ts';
import { signInMethodTests } from './accounts/signInMethods.ts';
import { pluginTests } from './accounts/plugin.ts';
import { ipadTests } from './accounts/ipad.ts';
import { guardTests } from './accounts/guards.ts';
import { statsTests } from './accounts/stats.ts';
import { patchTests } from './accounts/patches.ts';

const tests: AccountTests = {
  ...passkeyTests,
  ...signInMethodTests,
  ...pluginTests,
  ...ipadTests,
  ...guardTests,
  ...statsTests,
  ...patchTests,
};

try {
  for (const [name, value] of Object.entries(tests)) {
    if (only && !only.includes(name)) continue;
    try {
      await value();
    } catch (error) {
      check(name, false, String((error as Error).stack ?? error).slice(0, 600));
    }
  }
} finally {
  await browser.close();
  await server.stop();
  mocks.close();
}
writeFileSync(`${OUT}/summary.json`, JSON.stringify(results, null, 2));
const ok = results.length > 0 && results.every((result) => result.ok);
console.log(
  JSON.stringify({
    ok,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).map((r) => r.name),
  }),
);
process.exit(ok ? 0 : 1);
