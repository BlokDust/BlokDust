// pnpm test:gallery — CHG-0024 acceptance (SPEC-SHARING-GALLERY), black-box through the real app and the Worker
// (local `wrangler dev`, mocked siteverify, Chrome's virtual passkey authenticator for the accounts).
import { writeFileSync } from 'node:fs';
import { OUT, browser, check, mocks, results, server } from './gallery/harness.ts';
import { publishAndLike } from './gallery/publish.ts';
import { searchOpenAndRemix } from './gallery/browse.ts';
import { reportAndReview } from './gallery/reports.ts';
import { saveVideoAndScroll } from './gallery/saving.ts';
import { presetExamples } from './gallery/presets.ts';
import { insertedPatches } from './gallery/lineage.ts';
import { deletionAndSignIn } from './gallery/signedOut.ts';
import { pluginGallery } from './gallery/plugins.ts';

try {
  const { alice, aliceId, anon, bob } = await publishAndLike();
  await searchOpenAndRemix({ aliceId, bob });
  const { carol, dave, fay, gus } = await reportAndReview({ aliceId, anon, bob });
  await saveVideoAndScroll({ alice, aliceId, anon, carol });
  await presetExamples({ anon, carol });
  const examples = await insertedPatches({ alice, anon, bob, carol, dave, fay, gus });
  await deletionAndSignIn({ alice, anon, bob, carol }, examples);
  await pluginGallery();
} catch (error) {
  check('gallery run', false, String((error as Error).stack ?? error).slice(0, 800));
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
