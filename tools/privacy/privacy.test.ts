// SPEC-PROCESS-PRIVATE-OPERATIONAL-CONFIGURATION R1–R5: isolated settings, command injection, redaction and deploy paths.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { inspect } from './rules.ts';

void test('R5: catches private data and reports only locations/categories', () => {
  const host = ['test-device', 'tail', 'abcdef', 'ts', 'net'].join('.').replace('tail.', 'tail');
  const findings = inspect(
    'fixture',
    `https://${host}/\n${['person', 'personal.invalid'].join('@')}\n${['', 'Users', 'someone', 'private', 'file'].join('/')}\n`,
  );
  assert.equal(findings.length, 3);
  assert(!JSON.stringify(findings).includes(host));
  assert.equal(
    inspect(
      'fixture',
      'user@example.com\n/Users/me/kick.wav\nDeveloper ID Application: <identity>\n',
    ).length,
    0,
  );
});

void test('R1–R4: dotenv stays outside checkout; environment wins; values are not shell code; missing settings name only', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bd-private-test-'));
  try {
    writeFileSync(
      join(dir, 'config.env'),
      'BLOKDUST_TEST_HOST="local alias"\nBLOKDUST_LITERAL="$(touch should-not-exist)"\nNODE_OPTIONS="--invalid-option"\n',
    );
    const run = (code: string, extra: NodeJS.ProcessEnv = {}) =>
      spawnSync(process.execPath, ['--input-type=module', '-e', code], {
        encoding: 'utf8',
        env: { ...process.env, BLOKDUST_CONFIG_DIR: dir, ...extra },
      });
    let result = run(
      "import { setting, configEnvironment } from './tools/lib/local-config.ts'; console.log(JSON.stringify([setting('BLOKDUST_TEST_HOST'),setting('BLOKDUST_LITERAL'),configEnvironment().NODE_OPTIONS]));",
      { BLOKDUST_TEST_HOST: 'override' },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), [
      'override',
      '$(touch should-not-exist)',
      process.env.NODE_OPTIONS ?? null,
    ]);
    result = run(
      "import { requiredSetting } from './tools/lib/local-config.ts'; requiredSetting('BLOKDUST_UNSET_TEST');",
    );
    assert.notEqual(result.status, 0);
    assert(result.stderr.includes('Missing BLOKDUST_UNSET_TEST'));
    assert(!result.stderr.includes('local alias'));
    result = run("import './tools/lib/local-config.ts';", { BLOKDUST_CONFIG_DIR: resolve('.') });
    assert.notEqual(result.status, 0);
    assert(result.stderr.includes('must be outside the checkout'));
    symlinkSync(resolve('.'), join(dir, 'checkout'), 'dir');
    result = run("import './tools/lib/local-config.ts';", {
      BLOKDUST_CONFIG_DIR: join(dir, 'checkout', 'not-created'),
    });
    assert.notEqual(result.status, 0);
    assert(result.stderr.includes('must be outside the checkout'));
    result = run(
      "import { setting } from './tools/lib/local-config.ts'; console.log(setting('BLOKDUST_TEST_HOST', 'public-default'));",
      {
        BLOKDUST_CONFIG_DIR: join(dir, 'absent'),
        BLOKDUST_TEST_HOST: undefined,
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), 'public-default');
    const config = {
      CLOUDFLARE_ACCOUNT_ID: 'account-for-test',
      BLOKDUST_STAGING_PUBLIC_URL: 'https://staging.example.com/blokdust',
      BLOKDUST_STAGING_DATABASE_ID: '11111111-1111-4111-8111-111111111111',
      BLOKDUST_STAGING_SUPPORT_DATABASE_ID: '22222222-2222-4222-8222-222222222222',
      BLOKDUST_STAGING_TURNSTILE_SITE_KEY: 'test-site-key',
    };
    result = run(
      "import { remoteConfig } from './tools/server/config.ts'; console.log(remoteConfig('staging'));",
      config,
    );
    assert.equal(result.status, 0, result.stderr);
    const path = result.stdout.trim(),
      parsed = JSON.parse(readFileSync(path, 'utf8'));
    assert(path.startsWith(dir + '/'));
    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.equal(parsed.account_id, config.CLOUDFLARE_ACCOUNT_ID);
    assert.equal(parsed.env.staging.vars.PUBLIC_BASE_URL, config.BLOKDUST_STAGING_PUBLIC_URL);
    assert.equal(
      parsed.env.staging.d1_databases[0].database_id,
      config.BLOKDUST_STAGING_DATABASE_ID,
    );
    assert.equal(
      parsed.env.staging.d1_databases[1].database_id,
      config.BLOKDUST_STAGING_SUPPORT_DATABASE_ID,
    );
    assert.equal(parsed.main, resolve('server/src/index.ts'));
    assert.equal(parsed.env.staging.d1_databases[0].migrations_dir, resolve('server/migrations'));
    const assets = parsed.env.staging.assets ?? parsed.assets;
    assert.equal(assets.directory, resolve('web/dist'));
    assert(!parsed.env.production);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

void test('R5: history scans only the commits HEAD adds to its base', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bd-privacy-history-'));
  const tool = resolve('tools/privacy/index.ts');
  const git = (...args: string[]) =>
    spawnSync('git', ['-C', dir, ...args], {
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Test',
        GIT_AUTHOR_EMAIL: '1+test@users.noreply.github.com',
        GIT_COMMITTER_NAME: 'Test',
        GIT_COMMITTER_EMAIL: '1+test@users.noreply.github.com',
      },
    });
  const email = ['person', 'personal.invalid'].join('@');
  const history = (...args: string[]) => {
    const result = spawnSync(process.execPath, [tool, 'history', ...args], {
      cwd: dir,
      encoding: 'utf8',
    });
    return {
      status: result.status,
      out: JSON.parse(result.stdout) as { findings: { file: string }[] },
    };
  };
  try {
    git('init', '-q', '-b', 'main');
    writeFileSync(join(dir, 'old.txt'), `${email}\n`);
    git('add', '.');
    git('commit', '-qm', 'old');
    git('branch', 'base');
    writeFileSync(join(dir, 'clean.txt'), 'nothing private\n');
    git('add', '.');
    git('commit', '-qm', 'clean');
    const clean = history('--base', 'base');
    assert.equal(clean.status, 0);
    assert.equal(clean.out.findings.length, 0);
    writeFileSync(join(dir, 'new.txt'), `contact: ${email}\n`); // not old.txt's blob
    git('add', '.');
    git('commit', '-qm', 'new');
    const leaked = history('--base', 'base');
    assert.equal(leaked.status, 1);
    assert.deepEqual(
      leaked.out.findings.map((finding) => finding.file.split(':')[1]),
      ['new.txt'],
    );
    assert(!JSON.stringify(leaked.out).includes(email));
    const missing = spawnSync(process.execPath, [tool, 'history', '--base', 'no-such-ref'], {
      cwd: dir,
      encoding: 'utf8',
    });
    assert.notEqual(missing.status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
