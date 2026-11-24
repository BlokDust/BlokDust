// The dashboard's fixed queries over Workers Analytics Engine (SPEC-SHARING-USAGE-ANALYTICS R10). Shared by the Worker's
// private dashboard and `pnpm bd analytics`. Nobody can send their own SQL: only the dataset name (checked) and the
// number of days (an integer) vary. Blob layout: server/src/events.ts.

const DATASET_RE = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
/** Sum of weights: one stored point stands for _sample_interval (AE's own sampling) × double1 (the client's rate). */
const N = 'SUM(_sample_interval * double1)';

export function queries(dataset: string, days: number): Record<string, string> {
  if (!DATASET_RE.test(dataset)) throw new Error('bad dataset name');
  const d = Math.max(1, Math.min(90, Math.floor(days)));
  const since = `timestamp > NOW() - INTERVAL '${d}' DAY`;
  const of = (e: string) => `blob1 = '${e}' AND ${since}`;
  return {
    totals: `SELECT blob1 AS event, ${N} AS n FROM ${dataset} WHERE ${since} GROUP BY event ORDER BY n DESC LIMIT 100`,
    daily: `SELECT toStartOfDay(timestamp) AS day, blob1 AS event, ${N} AS n FROM ${dataset} WHERE ${since} AND blob1 IN ('session_start', 'audio_started', 'patch_created', 'patch_saved', 'patch_shared', 'plugin_active') GROUP BY day, event ORDER BY day ASC LIMIT 1000`,
    visitors: `SELECT toStartOfDay(timestamp) AS day, count(DISTINCT blob7) AS visitors FROM ${dataset} WHERE ${of('session_start')} GROUP BY day ORDER BY day ASC LIMIT 100`,
    surfaces: `SELECT blob2 AS surface, ${N} AS n FROM ${dataset} WHERE ${of('session_start')} GROUP BY surface ORDER BY n DESC LIMIT 20`,
    blocks: `SELECT blob8 AS type, SUM(_sample_interval * double1 * double2) AS n FROM ${dataset} WHERE ${of('block_added')} GROUP BY type ORDER BY n DESC LIMIT 60`,
    samples: `SELECT blob8 AS source, ${N} AS n FROM ${dataset} WHERE ${of('sample_loaded')} GROUP BY source ORDER BY n DESC LIMIT 20`,
    opened: `SELECT blob8 AS source, ${N} AS n FROM ${dataset} WHERE ${of('patch_opened')} GROUP BY source ORDER BY n DESC LIMIT 20`,
    countries: `SELECT blob6 AS country, ${N} AS n FROM ${dataset} WHERE ${of('session_start')} GROUP BY country ORDER BY n DESC LIMIT 25`,
    browsers: `SELECT blob4 AS os, blob5 AS browser, ${N} AS n FROM ${dataset} WHERE ${of('session_start')} GROUP BY os, browser ORDER BY n DESC LIMIT 25`,
    referrers: `SELECT blob8 AS referrer, ${N} AS n FROM ${dataset} WHERE ${of('session_start')} AND blob8 != '' GROUP BY referrer ORDER BY n DESC LIMIT 25`,
    embedHosts: `SELECT blob9 AS host, ${N} AS n FROM ${dataset} WHERE ${of('session_start')} AND blob9 != '' GROUP BY host ORDER BY n DESC LIMIT 25`,
    // Plugins (R8): installs are distinct install hashes; plugin_active is sent at most once a day per install.
    pluginDaily: `SELECT toStartOfDay(timestamp) AS day, count(DISTINCT blob7) AS installs FROM ${dataset} WHERE ${of('plugin_active')} GROUP BY day ORDER BY day ASC LIMIT 100`,
    pluginInstalls: `SELECT count(DISTINCT blob7) AS installs FROM ${dataset} WHERE ${of('plugin_active')}`,
    daws: `SELECT blob9 AS host, blob10 AS version, count(DISTINCT blob7) AS installs FROM ${dataset} WHERE ${of('plugin_active')} GROUP BY host, version ORDER BY installs DESC LIMIT 50`,
    pluginFormats: `SELECT blob2 AS format, blob8 AS kind, blob4 AS os, blob11 AS arch, count(DISTINCT blob7) AS installs FROM ${dataset} WHERE ${of('plugin_active')} GROUP BY format, kind, os, arch ORDER BY installs DESC LIMIT 50`,
    versions: `SELECT blob2 AS surface, blob3 AS version, ${N} AS n FROM ${dataset} WHERE ${since} AND blob1 IN ('session_start', 'plugin_active') GROUP BY surface, version ORDER BY n DESC LIMIT 30`,
    problems: `SELECT blob1 AS event, blob8 AS detail, double2 AS code, ${N} AS n FROM ${dataset} WHERE ${since} AND blob1 IN ('audio_failed', 'wasm_unsupported', 'save_failed', 'freesound_error', 'plugin_error') GROUP BY event, detail, code ORDER BY n DESC LIMIT 50`,
    perf: `SELECT blob8 AS fps, ${N} AS n FROM ${dataset} WHERE ${of('perf')} GROUP BY fps ORDER BY n DESC LIMIT 10`,
  };
}

export interface SqlTarget {
  url: string;
  token: string;
}
/** The SQL API endpoint for an account (or a test's mock). */
export const sqlUrl = (accountId: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/analytics_engine/sql`;

/** Run every query; a failing one reports its error instead of failing the rest. */
export async function runQueries(
  target: SqlTarget,
  dataset: string,
  days: number,
  fetcher: typeof fetch = fetch,
): Promise<Record<string, { rows?: Record<string, unknown>[]; error?: string }>> {
  const out: Record<string, { rows?: Record<string, unknown>[]; error?: string }> = {};
  await Promise.all(
    Object.entries(queries(dataset, days)).map(async ([name, sql]) => {
      try {
        const response = await fetcher(target.url, {
          method: 'POST',
          headers: { authorization: `Bearer ${target.token}` },
          body: `${sql} FORMAT JSON`,
        });
        if (!response.ok) {
          out[name] = {
            error: `HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`,
          };
          return;
        }
        out[name] = {
          rows: ((await response.json()) as { data?: Record<string, unknown>[] }).data ?? [],
        };
      } catch (e) {
        out[name] = { error: String(e).slice(0, 200) };
      }
    }),
  );
  return out;
}
