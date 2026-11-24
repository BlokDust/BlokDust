// CHG-0036 R1/R2/R6: actual native plugin WebView -> deployed staging support API -> dedicated D1.
// Requires a plugin built with BLOKDUST_SUPPORT_PUBLIC_URL pointing to staging. Removes its own report afterward.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { remoteConfig } from '../../tools/server/config.ts';
import { run, WRANGLER } from '../../tools/server/lib.ts';

assert.equal(process.platform, 'darwin', 'native smoke currently uses the macOS VST3 host');
mkdirSync('.cache', { recursive: true });
const diag = resolve('.cache/support-native-smoke.json');
const host = resolve('build/plugin/plugin/blokdust_host_test_artefacts/Release/blokdust_host_test');
const plugin = resolve('build/plugin/plugin/BlokDust_artefacts/Release/VST3/BlokDust.vst3');
const result = await new Promise<string>((resolve, reject) => {
  const child = spawn(host, [plugin, 'tests/golden/emitter-tone.json', '--editor', diag], {
    env: { ...process.env, BLOKDUST_SUPPORT_SMOKE: '1', BLOKDUST_DIAG_FILE: diag },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (d) => {
    out += d;
  });
  // Host diagnostics may contain local paths; keep them out of committed results and terminal summaries.
  child.stderr.resume();
  child.on('error', reject);
  child.on('close', (code) =>
    code === 0 ? resolve(out) : reject(new Error('native support smoke host failed')),
  );
});
const data = JSON.parse(result.trim().split('\n').at(-1)!);
assert.equal(
  data.editor?.success,
  true,
  `native panel failed: ${data.editor?.status ?? 'timeout'}`,
);
const id =
  typeof data.editor.id === 'string'
    ? data.editor.id.match(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/)?.[0]
    : null;
assert.ok(id, 'test transport must capture the private API reference');
const config = remoteConfig('staging');
async function sql(command: string): Promise<any[]> {
  const r = await run(
    [
      WRANGLER,
      'd1',
      'execute',
      'blokdust-support-staging',
      '--remote',
      '--env',
      'staging',
      '--config',
      config,
      '--command',
      command,
      '--json',
    ],
    { quiet: true },
  );
  assert.equal(r.code, 0, 'staging database query failed');
  return JSON.parse(r.out.slice(r.out.search(/^\[/m)))[0].results; // wrangler may print warnings (with brackets) before the JSON
}
try {
  const rows = await sql(
    `SELECT r.kind, r.message, r.version, r.surface, c.system_json, c.patch_json FROM support_reports r JOIN support_context c ON c.report_id=r.id WHERE r.id='${id}'`,
  );
  assert.equal(rows.length, 1);
  const row = rows[0],
    system = JSON.parse(row.system_json),
    patch = JSON.parse(row.patch_json);
  assert.equal(row.message, 'CHG-0036 native plugin support smoke test');
  assert.equal(row.surface, 'plugin');
  assert.equal(system.format, 'VST3');
  assert.ok(system.sampleRate > 0 && system.bufferSize > 0);
  assert.equal(patch.blocks.length, 2);
  assert.ok(!row.patch_json.includes('refs'));
  console.log(
    JSON.stringify({
      nativePanelSubmission: 'pass',
      stagingStorage: 'pass',
      pluginSystemAndPatch: 'pass',
    }),
  );
} finally {
  await sql(`DELETE FROM support_reports WHERE id='${id}'`);
}
