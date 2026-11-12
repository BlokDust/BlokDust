// SPEC-PROCESS-PRIVATE-OPERATIONAL-CONFIGURATION R1–R5: isolated settings, command injection, redaction and deploy paths.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { inspect } from './rules.ts';

test('R5: catches private data and reports only locations/categories', () => {
  const host = ['test-device', 'tail', 'abcdef', 'ts', 'net'].join('.').replace('tail.', 'tail');
  const findings = inspect('fixture', `https://${host}/\n${['person', 'personal.invalid'].join('@')}\n${['', 'Users', 'someone', 'private', 'file'].join('/')}\n`);
  assert.equal(findings.length, 3);
  assert(!JSON.stringify(findings).includes(host));
  assert.equal(inspect('fixture', 'user@example.com\n/Users/me/kick.wav\nDeveloper ID Application: <identity>\n').length, 0);
});

test('R1–R4: dotenv stays outside checkout; environment wins; values are not shell code; missing settings name only', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bd-private-test-'));
  try {
    writeFileSync(join(dir, 'config.env'), 'BLOKDUST_TEST_HOST="local alias"\nBLOKDUST_LITERAL="$(touch should-not-exist)"\nNODE_OPTIONS="--invalid-option"\n');
    const run = (code: string, extra: NodeJS.ProcessEnv = {}) => spawnSync(process.execPath, ['--input-type=module', '-e', code], {
      encoding: 'utf8', env: { ...process.env, BLOKDUST_CONFIG_DIR: dir, ...extra },
    });
    let r = run("import { setting, configEnvironment } from './tools/lib/local-config.ts'; console.log(JSON.stringify([setting('BLOKDUST_TEST_HOST'),setting('BLOKDUST_LITERAL'),configEnvironment().NODE_OPTIONS]));", { BLOKDUST_TEST_HOST: 'override' });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout), ['override', '$(touch should-not-exist)', process.env.NODE_OPTIONS ?? null]);
    r = run("import { requiredSetting } from './tools/lib/local-config.ts'; requiredSetting('BLOKDUST_UNSET_TEST');");
    assert.notEqual(r.status, 0);
    assert(r.stderr.includes('Missing BLOKDUST_UNSET_TEST'));
    assert(!r.stderr.includes('local alias'));
    r = run("import './tools/lib/local-config.ts';", { BLOKDUST_CONFIG_DIR: resolve('.') });
    assert.notEqual(r.status, 0);
    assert(r.stderr.includes('must be outside the checkout'));
    symlinkSync(resolve('.'), join(dir, 'checkout'), 'dir');
    r = run("import './tools/lib/local-config.ts';", { BLOKDUST_CONFIG_DIR: join(dir, 'checkout', 'not-created') });
    assert.notEqual(r.status, 0);
    assert(r.stderr.includes('must be outside the checkout'));
    r = run("import { setting } from './tools/lib/local-config.ts'; console.log(setting('BLOKDUST_TEST_HOST', 'public-default'));", {
      BLOKDUST_CONFIG_DIR: join(dir, 'absent'), BLOKDUST_TEST_HOST: undefined,
    });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), 'public-default');
    const config = {
      CLOUDFLARE_ACCOUNT_ID: 'account-for-test', BLOKDUST_STAGING_PUBLIC_URL: 'https://staging.example.com/blokdust',
      BLOKDUST_STAGING_DATABASE_ID: '11111111-1111-4111-8111-111111111111', BLOKDUST_STAGING_SUPPORT_DATABASE_ID: '22222222-2222-4222-8222-222222222222', BLOKDUST_STAGING_TURNSTILE_SITE_KEY: 'test-site-key',
    };
    r = run("import { remoteConfig } from './tools/server/config.ts'; console.log(remoteConfig('staging'));", config);
    assert.equal(r.status, 0, r.stderr);
    const path = r.stdout.trim(), parsed = JSON.parse(readFileSync(path, 'utf8'));
    assert(path.startsWith(dir + '/'));
    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.equal(parsed.account_id, config.CLOUDFLARE_ACCOUNT_ID);
    assert.equal(parsed.env.staging.vars.PUBLIC_BASE_URL, config.BLOKDUST_STAGING_PUBLIC_URL);
    assert.equal(parsed.env.staging.d1_databases[0].database_id, config.BLOKDUST_STAGING_DATABASE_ID);
    assert.equal(parsed.main, resolve('server/src/index.ts'));
    assert.equal(parsed.env.staging.d1_databases[0].migrations_dir, resolve('server/migrations'));
    const assets = parsed.env.staging.assets ?? parsed.assets;
    assert.equal(assets.directory, resolve(parsed.env.staging.assets ? '.cache/server/site' : 'web/dist'));
    assert(!parsed.env.production);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
