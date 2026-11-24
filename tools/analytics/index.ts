// bd analytics — the private dashboard's queries from the command line (SHARING-0010, SPEC-SHARING-USAGE-ANALYTICS R10).
//   pnpm bd analytics --env staging|production [--days 7] [--only daws,blocks]
//   pnpm bd analytics --sql --env staging [--days 7]           print the queries instead of running them
// Needs CLOUDFLARE_ACCOUNT_ID (config.env) and an Account Analytics: Read token in ~/.config/blokdust/analytics_token.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG_DIR, requiredSetting } from '../lib/local-config.ts';
import { queries, runQueries, sqlUrl } from '../../server/src/analyticsQueries.ts';

const args = process.argv.slice(2);
const opt = (k: string) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};
const env = opt('--env');
if (env !== 'staging' && env !== 'production') {
  console.error(
    'usage: pnpm bd analytics --env staging|production [--days 7] [--only a,b] [--sql]',
  );
  process.exit(2);
}
// The dataset names are public (server/wrangler.jsonc).
const dataset = env === 'staging' ? 'blokdust_events_staging' : 'blokdust_events';
const days = Number(opt('--days') ?? 7) || 7;
const only = opt('--only')?.split(',');

if (args.includes('--sql')) {
  const q = queries(dataset, days);
  console.log(
    JSON.stringify(
      only ? Object.fromEntries(Object.entries(q).filter(([k]) => only.includes(k))) : q,
      null,
      2,
    ),
  );
} else {
  const tokenFile = join(CONFIG_DIR, 'analytics_token');
  if (!existsSync(tokenFile)) {
    console.error(
      `no query token: put an Account Analytics: Read token in ${tokenFile} (chmod 600)`,
    );
    process.exit(1);
  }
  const token = readFileSync(tokenFile, 'utf8').trim();
  const all = await runQueries(
    { url: sqlUrl(requiredSetting('CLOUDFLARE_ACCOUNT_ID')), token },
    dataset,
    days,
  );
  const results = only
    ? Object.fromEntries(Object.entries(all).filter(([k]) => only.includes(k)))
    : all;
  const failed = Object.entries(results).filter(([, value]) => value.error);
  for (const [k, value] of failed) console.error(`${k}: ${value.error}`);
  console.log(JSON.stringify({ env, dataset, days, results }, null, 2));
  if (failed.length === Object.keys(results).length) process.exit(1);
}
