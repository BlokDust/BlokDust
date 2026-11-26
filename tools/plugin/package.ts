// bd plugin package (macOS): the universal macOS 11+ installer, signed and notarised, with its
// .sha256 (CHG-0005 task 12).
import { webBuildFor } from './web.ts';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { VERSION, run } from './paths.ts';
import { signBundles } from './sign.ts';

/**
 * The macOS installer (CHG-0005 task 12): BlokDust-<version>-Mac.pkg with both plugins as VST3 and AU and the BlokDust Standalone app, built
 * universal (arm64 + x86_64) for macOS 11+ (`plugin-release` preset), Developer ID signed, the package signed with
 * Developer ID Installer, notarised, stapled and accepted by Gatekeeper; plus its .sha256. The licences go to
 * /Library/Application Support/BlokDust. See docs/engineering/signing.md.
 */
export function packageMac(profile: string, appId: string, installerId: string, noBuild: boolean) {
  if (process.platform !== 'darwin') throw new Error('macOS only');
  if (!noBuild) {
    webBuildFor('production'); // installers talk to the live site (CHG-0039)
    if (run('cmake', ['--preset', 'plugin-release']).status !== 0)
      throw new Error('configure failed');
    if (run('cmake', ['--build', '--preset', 'plugin-release', '-j', '8']).status !== 0)
      throw new Error('build failed');
  }
  const out = resolve('build/plugin-release/dist');
  const staging = join(out, 'staging');
  const bundles = signBundles('build/plugin-release', join(staging, 'bundles'), appId);
  // Every binary: both architectures, macOS 11, the release version.
  const checks = bundles.map((b) => {
    const name = b.path.split('/').pop()!,
      exe = join(b.path, 'Contents/MacOS', name.replace(/\.(vst3|component|app)$/, ''));
    const archs = run('lipo', ['-archs', exe], true).stdout.trim().split(/\s+/).sort().join(',');
    const minos = /minos (\S+)/.exec(run('vtool', ['-show-build', exe], true).stdout)?.[1];
    const plist = run(
      '/usr/libexec/PlistBuddy',
      ['-c', 'Print :CFBundleShortVersionString', join(b.path, 'Contents/Info.plist')],
      true,
    ).stdout.trim();
    return { name, archs, minos, version: plist };
  });
  const bad = checks.filter(
    (check) =>
      check.archs !== 'arm64,x86_64' || check.minos !== '11.0' || check.version !== VERSION,
  );
  if (bad.length) throw new Error(`not releasable: ${JSON.stringify(bad)}`);
  // One component package per install location.
  const roots: Record<string, { dir: string; ext?: string; to: string }> = {
    vst3: { dir: join(staging, 'vst3'), ext: '.vst3', to: '/Library/Audio/Plug-Ins/VST3' },
    au: { dir: join(staging, 'au'), ext: '.component', to: '/Library/Audio/Plug-Ins/Components' },
    app: { dir: join(staging, 'app'), ext: '.app', to: '/Applications' },
    docs: { dir: join(staging, 'docs'), to: '/Library/Application Support/BlokDust' },
  };
  const pkgs = join(staging, 'pkgs');
  mkdirSync(pkgs, { recursive: true });
  for (const [key, value] of Object.entries(roots)) {
    mkdirSync(value.dir, { recursive: true });
    if (value.ext)
      for (const b of bundles.filter((x) => x.path.endsWith(value.ext!)))
        cpSync(b.path, join(value.dir, b.path.split('/').pop()!), {
          recursive: true,
          verbatimSymlinks: true,
        });
    else {
      cpSync('NOTICE.md', join(value.dir, 'NOTICE.txt'));
      cpSync('LICENSE', join(value.dir, 'LICENSE.txt'));
    }
    const args = [
      '--root',
      value.dir,
      '--identifier',
      `com.funputs.blokdust.pkg.${key}`,
      '--version',
      VERSION,
      '--install-location',
      value.to,
    ];
    if (value.ext) {
      // Install where it says, not over a copy the user moved elsewhere (bundles are relocatable by default).
      const plist = join(staging, `${key}.plist`);
      run('pkgbuild', ['--analyze', '--root', value.dir, plist], true);
      // The plist is an array with one entry per top-level bundle.
      for (
        let i = 0;
        run('/usr/libexec/PlistBuddy', ['-c', `Set :${i}:BundleIsRelocatable false`, plist], true)
          .status === 0;
        i++
      );
      args.push('--component-plist', plist);
    }
    const result = run('pkgbuild', [...args, join(pkgs, `${key}.pkg`)], true);
    if (result.status !== 0) throw new Error(`pkgbuild ${key}: ${result.stderr}`);
  }
  const ref = (key: string) =>
    `<pkg-ref id="com.funputs.blokdust.pkg.${key}" version="${VERSION}">${key}.pkg</pkg-ref>`;
  writeFileSync(
    join(staging, 'distribution.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="2">
    <title>BlokDust ${VERSION}</title>
    <organization>com.funputs</organization>
    <options customize="allow" require-scripts="false" hostArchitectures="arm64,x86_64"/>
    <volume-check><allowed-os-versions><os-version min="11.0"/></allowed-os-versions></volume-check>
    <choices-outline>
        <line choice="vst3"/><line choice="au"/><line choice="app"/><line choice="docs"/>
    </choices-outline>
    <choice id="vst3" title="VST3 plug-ins" description="BlokDust and BlokDust FX, in /Library/Audio/Plug-Ins/VST3 (Live, REAPER, Bitwig, Cubase)."><pkg-ref id="com.funputs.blokdust.pkg.vst3"/></choice>
    <choice id="au" title="Audio Unit plug-ins" description="BlokDust and BlokDust FX, in /Library/Audio/Plug-Ins/Components (Logic, GarageBand)."><pkg-ref id="com.funputs.blokdust.pkg.au"/></choice>
    <choice id="app" title="Standalone app" description="BlokDust, in /Applications."><pkg-ref id="com.funputs.blokdust.pkg.app"/></choice>
    <choice id="docs" title="Licences" visible="false" description="Notices and licences."><pkg-ref id="com.funputs.blokdust.pkg.docs"/></choice>
    ${ref('vst3')}
    ${ref('au')}
    ${ref('app')}
    ${ref('docs')}
</installer-gui-script>
`,
  );
  const pkg = join(out, `BlokDust-${VERSION}-Mac.pkg`);
  rmSync(pkg, { force: true });
  const pb = run(
    'productbuild',
    [
      '--distribution',
      join(staging, 'distribution.xml'),
      '--package-path',
      pkgs,
      '--sign',
      installerId,
      '--timestamp',
      pkg,
    ],
    true,
  );
  if (pb.status !== 0) throw new Error(`productbuild: ${pb.stderr}`);
  const result: Record<string, unknown> = { pkg, version: VERSION, bundles: checks };
  // Notarisation credentials live once in this Mac's login keychain (never in the repo): docs/engineering/signing.md.
  if (run('xcrun', ['notarytool', 'history', '--keychain-profile', profile], true).status !== 0) {
    result.notarization = {
      status: 'missing credentials',
      fix: `xcrun notarytool store-credentials ${profile} --apple-id <apple-id> --team-id <team-id> --password <app-specific-password>`,
    };
    console.log(JSON.stringify(result));
    process.exit(2);
  }
  const notarised = run(
    'xcrun',
    [
      'notarytool',
      'submit',
      pkg,
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
    sub = JSON.parse(notarised.stdout);
  } catch {
    sub = { status: 'error', message: `${notarised.stdout}${notarised.stderr}`.trim() };
  }
  result.notarization = { id: sub.id, status: sub.status, message: sub.message };
  if (sub.status !== 'Accepted') {
    if (sub.id)
      console.error(
        run('xcrun', ['notarytool', 'log', sub.id, '--keychain-profile', profile], true).stdout,
      );
    console.log(JSON.stringify(result));
    process.exit(1);
  }
  const st = run('xcrun', ['stapler', 'staple', pkg], true);
  if (st.status !== 0) throw new Error(`staple: ${st.stdout}${st.stderr}`);
  // What a user's Mac decides, asked the way it asks.
  const assessment = run('spctl', ['--assess', '--type', 'install', '-vv', pkg], true);
  result.gatekeeper = {
    ok: `${assessment.stdout}${assessment.stderr}`.includes('accepted'),
    source: /source=(.*)/.exec(`${assessment.stdout}${assessment.stderr}`)?.[1] ?? null,
  };
  const sha = run('shasum', ['-a', '256', pkg], true).stdout.split(/\s+/)[0];
  writeFileSync(`${pkg}.sha256`, `${sha}  BlokDust-${VERSION}-Mac.pkg\n`);
  result.sha256 = sha;
  rmSync(staging, { recursive: true, force: true });
  console.log(JSON.stringify(result));
  if (!(result.gatekeeper as { ok: boolean }).ok) process.exit(1);
}
