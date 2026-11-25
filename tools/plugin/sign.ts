// bd plugin sign (macOS): Developer ID sign with the hardened runtime, notarise, staple, check
// Gatekeeper → build/plugin/dist/BlokDust-macOS.zip.
import { cpSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { run } from './paths.ts';
import { build } from './build.ts';

/** Copy every bundle (both plugins × VST3, AU; the Standalone app is BlokDust's only, CHG-0010) from a build tree into `dist` and Developer ID sign each
 * with hardened runtime and a secure timestamp. */
export function signBundles(
  buildDir: string,
  dist: string,
  identity: string,
): { path: string; entitlements: string }[] {
  rmSync(dist, { recursive: true, force: true });
  run('mkdir', ['-p', dist], true);
  const bundles: { path: string; entitlements: string }[] = [];
  for (const [target, product] of [
    ['BlokDust', 'BlokDust'],
    ['BlokDustFX', 'BlokDust FX'],
  ]) {
    const art = `${buildDir}/plugin/${target}_artefacts`;
    for (const [fmt, ext] of [
      ['VST3', 'vst3'],
      ['AU', 'component'],
      ['Standalone', 'app'],
    ]) {
      if (fmt === 'Standalone' && target === 'BlokDustFX') continue; // an older build tree may still hold one
      const src = `${art}/Release/${fmt}/${product}.${ext}`;
      const dest = join(dist, `${product}.${ext}`);
      cpSync(src, dest, { recursive: true, verbatimSymlinks: true });
      bundles.push({
        path: dest,
        entitlements: `${art}/JuceLibraryCode/${target}_${fmt}.entitlements`,
      });
    }
  }
  for (const b of bundles) {
    const result = run(
      'codesign',
      [
        '--force',
        '--options',
        'runtime',
        '--timestamp',
        '--entitlements',
        b.entitlements,
        '--sign',
        identity,
        b.path,
      ],
      true,
    );
    if (result.status !== 0) throw new Error(`codesign ${b.path}: ${result.stderr}`);
    const v = run('codesign', ['--verify', '--strict', '--deep', b.path], true);
    if (v.status !== 0) throw new Error(`verify ${b.path}: ${v.stderr}`);
  }
  return bundles;
}

export function sign(profile: string, identity: string) {
  if (process.platform !== 'darwin') throw new Error('macOS only');
  build();
  const dist = resolve('build/plugin/dist/macos');
  const bundles = signBundles('build/plugin', dist, identity);
  const result: Record<string, unknown> = {
    identity,
    profile,
    bundles: bundles.map((b) => b.path.split('/').pop()),
  };
  result.signed = 'pass';
  // Notarisation needs credentials stored once in the login keychain (never in the repo): see docs/engineering/signing.md.
  const hasProfile =
    run('xcrun', ['notarytool', 'history', '--keychain-profile', profile], true).status === 0;
  if (!hasProfile) {
    result.notarization = {
      status: 'skipped',
      reason: `no keychain profile "${profile}"`,
      fix: `xcrun notarytool store-credentials ${profile} --apple-id <apple-id> --team-id <team-id> --password <app-specific-password>`,
    };
    console.log(JSON.stringify(result));
    return; // signed and verified; notarise later with the same command once the profile exists
  }
  const zip = resolve('build/plugin/dist/BlokDust-macOS.zip');
  rmSync(zip, { force: true });
  run('ditto', ['-c', '-k', '--keepParent', dist, zip], true);
  const n = run(
    'xcrun',
    [
      'notarytool',
      'submit',
      zip,
      '--keychain-profile',
      profile,
      '--wait',
      '--timeout',
      '30m',
      '--output-format',
      'json',
    ],
    true,
  );
  let sub: any = {};
  try {
    sub = JSON.parse(n.stdout);
  } catch {
    sub = { status: 'error', message: `${n.stdout}${n.stderr}`.trim() };
  }
  result.notarization = { id: sub.id, status: sub.status };
  if (sub.status !== 'Accepted') {
    if (sub.id)
      console.error(
        run('xcrun', ['notarytool', 'log', sub.id, '--keychain-profile', profile], true).stdout,
      );
    console.log(JSON.stringify(result));
    process.exit(1);
  }
  for (const b of bundles) {
    const st = run('xcrun', ['stapler', 'staple', b.path], true);
    if (st.status !== 0) throw new Error(`staple ${b.path}: ${st.stdout}${st.stderr}`);
  }
  result.stapled = 'pass';
  // Gatekeeper's verdict on the apps (plugins are loaded by hosts, not assessed as executables).
  result.gatekeeper = bundles
    .filter((b) => b.path.endsWith('.app'))
    .map((b) => {
      const result = run('spctl', ['--assess', '--type', 'execute', '-vv', b.path], true);
      return {
        app: b.path.split('/').pop(),
        ok: result.status === 0,
        source: /source=(.*)/.exec(`${result.stdout}${result.stderr}`)?.[1] ?? null,
      };
    });
  rmSync(zip, { force: true });
  run('ditto', ['-c', '-k', '--keepParent', dist, zip], true); // re-zip with stapled tickets
  result.artifact = zip;
  console.log(JSON.stringify(result));
  if ((result.gatekeeper as any[]).some((g) => !g.ok)) process.exit(1);
}
