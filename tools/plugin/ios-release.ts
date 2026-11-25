// bd plugin ios archive — the iPad app for the App Store (CHG-0025 task 12b).
//   pnpm bd plugin ios archive [--build N] [--upload]
//   Builds against the live site (as installers do, tools/plugin/web.ts) in its own folder (build/plugin-ios-release),
//   archives with automatic signing (team BLOKDUST_APPLE_TEAM_ID, the team's Apple account in Xcode), checks the
//   archive (one version and build number in the app and both extensions, privacy manifests, the encryption
//   declaration) and exports an App Store .ipa to .cache/ios-release/<version>-<build>/.
//   --upload sends the build to App Store Connect (TestFlight) with Xcode's account instead of exporting it: that
//   publishes it to the team's App Store Connect, so only on the owner's go.
//   --build N: the build number (CFBundleVersion). Default: the UTC time as YYYYMMDD.HHMM, so each archive is newer.
// Signing and upload use an App Store Connect API key (Admin, so Xcode can make the distribution certificate and
// profiles): BLOKDUST_ASC_KEY_ID and BLOKDUST_ASC_ISSUER_ID in local config, the key at
// ~/.config/blokdust/app_store_connect_key.p8 (BLOKDUST_ASC_KEY_PATH). Command-line xcodebuild can't use the Apple
// account signed in to Xcode's app ("No Accounts").
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CONFIG_DIR, configEnvironment, requiredSetting, setting } from '../lib/local-config.ts';
import { must, run } from './ios-shared.ts';
import { webBuildFor } from './web.ts';

const PROJECT = 'build/plugin-ios-release/blokdust.xcodeproj';

const plistOf = (path: string) =>
  JSON.parse(
    must(run('plutil', ['-convert', 'json', '-o', '-', path], true), `read ${path}`).stdout,
  );

/** The first compiler or signing errors of a failed xcodebuild, with a hint when signing is what failed. */
function xcodeFailure(what: string, result: ReturnType<typeof spawnSync>): Error {
  const out = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const errors = [
    ...new Set(
      out
        .split('\n')
        .filter((line) => /error:|BUILD FAILED|ARCHIVE FAILED|EXPORT FAILED/.test(line)),
    ),
  ]
    .slice(0, 20)
    .join('\n');
  const account =
    /No Accounts|No Account for Team|No profiles for|requires a provisioning profile|Signing for .* requires a development team|No signing certificate/.test(
      out,
    )
      ? '\nXcode could not sign for the App Store: set up the App Store Connect API key (BLOKDUST_ASC_KEY_ID, BLOKDUST_ASC_ISSUER_ID, ~/.config/blokdust/app_store_connect_key.p8; Admin access).'
      : '';
  return new Error(`${what} failed:\n${errors || out.slice(-3000)}${account}`);
}

/** xcodebuild's App Store Connect API key arguments, or none (then only Xcode's own account, which may be missing). */
function apiKey(): string[] {
  const id = setting('BLOKDUST_ASC_KEY_ID'),
    issuer = setting('BLOKDUST_ASC_ISSUER_ID');
  const path = setting('BLOKDUST_ASC_KEY_PATH', resolve(CONFIG_DIR, 'app_store_connect_key.p8'));
  if (!id || !issuer) return [];
  if (!existsSync(path))
    throw new Error(`BLOKDUST_ASC_KEY_ID is set but the key file is missing: ${path}`);
  return [
    '-authenticationKeyPath',
    path,
    '-authenticationKeyID',
    id,
    '-authenticationKeyIssuerID',
    issuer,
  ];
}

/** UTC time as YYYYMMDD.HHMM: a valid CFBundleVersion that grows with every archive. */
function defaultBuild(): string {
  const date = new Date(),
    twoDigits = (value: number) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}${twoDigits(date.getUTCMonth() + 1)}${twoDigits(date.getUTCDate())}.${twoDigits(date.getUTCHours())}${twoDigits(date.getUTCMinutes())}`;
}

/** The bundles' dSYMs (crash-report symbols): CMake's targets write them beside their products,
 * where Xcode's archive doesn't look, so they are copied into the archive's dSYMs folder. */
const DSYMS: [string, string][] = [
  ['BlokDust.app', 'build/plugin-ios-release/plugin/BlokDust_artefacts/Release/Standalone'],
  ['BlokDust.appex', 'build/plugin-ios-release/plugin/BlokDust_artefacts/Release/AUv3'],
  ['BlokDust FX.appex', 'build/plugin-ios-release/plugin/BlokDustFX_artefacts/Release/AUv3'],
];
const uuids = (path: string) =>
  [...run('dwarfdump', ['--uuid', path], true).stdout.matchAll(/UUID: ([0-9A-F-]{36})/g)]
    .map((match) => match[1])
    .sort()
    .join();
function collectDsyms(archive: string): void {
  mkdirSync(`${archive}/dSYMs`, { recursive: true });
  for (const [name, dir] of DSYMS)
    if (existsSync(`${dir}/${name}.dSYM`))
      cpSync(`${dir}/${name}.dSYM`, `${archive}/dSYMs/${name}.dSYM`, { recursive: true });
}

/** What App Store Connect checks first, from the archive itself. */
function checkArchive(archive: string, version: string, build: string) {
  const app = `${archive}/Products/Applications/BlokDust.app`;
  const bundles = {
    app,
    instrument: `${app}/PlugIns/BlokDust.appex`,
    fx: `${app}/PlugIns/BlokDust FX.appex`,
  };
  const plists = Object.fromEntries(
    Object.entries(bundles).map(([k, b]) => [
      k,
      existsSync(`${b}/Info.plist`) ? plistOf(`${b}/Info.plist`) : null,
    ]),
  );
  const checks = {
    extensions: !!plists.instrument && !!plists.fx,
    versions: Object.values(plists).every(
      (entry) => entry?.CFBundleShortVersionString === version && entry?.CFBundleVersion === build,
    ),
    privacyManifests: Object.values(bundles).every((b) => existsSync(`${b}/PrivacyInfo.xcprivacy`)),
    encryptionDeclared: plists.app?.ITSAppUsesNonExemptEncryption === false,
    ipadOnly: JSON.stringify(plists.app?.UIDeviceFamily) === '[2]',
    bundleId: plists.app?.CFBundleIdentifier === 'com.funputs.blokdust',
    // Symbols for crash reports (App Store Connect warned "Upload Symbols Failed": preset plugin-ios-release makes them).
    // …and each one's UUIDs those of the binary it describes (this build's).
    dSYMs: Object.values(bundles).every((b) => {
      const bundleName = b.split('/').pop()!,
        exe = `${b}/${bundleName.replace(/\.(app|appex)$/, '')}`,
        dsym = `${archive}/dSYMs/${bundleName}.dSYM`;
      return existsSync(dsym) && uuids(dsym) !== '' && uuids(dsym) === uuids(exe);
    }),
    // An extension's ID is the app's plus one part (App Store Connect: "Bad bundle identifier").
    extensionIds: [plists.instrument, plists.fx].every((plist) =>
      /^com\.funputs\.blokdust\.[^.]+$/.test(plist?.CFBundleIdentifier ?? ''),
    ),
  };
  return { ok: Object.values(checks).every(Boolean), checks };
}

export function iosArchive(args: string[]): void {
  if (process.platform !== 'darwin') throw new Error('the iPadOS build needs macOS with Xcode');
  const team = requiredSetting('BLOKDUST_APPLE_TEAM_ID');
  const upload = args.includes('--upload');
  const build = args.includes('--build')
    ? (args[args.indexOf('--build') + 1] ?? '')
    : defaultBuild();
  if (!/^\d+(\.\d+){0,2}$/.test(build))
    throw new Error(`--build must be up to three numbers joined by dots, not ${build}`);
  const version = JSON.parse(readFileSync('package.json', 'utf8')).version as string;
  const out = resolve('.cache/ios-release', `${version}-${build}`);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  webBuildFor('production'); // the App Store app talks to the live site
  const env = configEnvironment();
  env.BLOKDUST_IOS_BUILD = build;
  // The site whose passkeys the app may use (SHARING-0011): the live site only.
  env.BLOKDUST_WEBCREDENTIALS = new URL(requiredSetting('BLOKDUST_PRODUCTION_PUBLIC_URL')).hostname;
  env.BLOKDUST_IOS_NATIVE_SIGN_IN = setting('BLOKDUST_IOS_NATIVE_SIGN_IN', '0');
  must(
    spawnSync('cmake', ['--preset', 'plugin-ios-release'], {
      stdio: ['ignore', 'inherit', 'inherit'],
      env,
    }),
    'configure (plugin-ios-release)',
  );

  const archive = resolve(out, 'BlokDust.xcarchive');
  const a = spawnSync(
    'xcodebuild',
    [
      '-project',
      PROJECT,
      '-scheme',
      'BlokDust_Standalone',
      '-configuration',
      'Release',
      '-destination',
      'generic/platform=iOS',
      '-archivePath',
      archive,
      '-allowProvisioningUpdates',
      ...apiKey(),
      '-quiet',
      'archive',
    ],
    { encoding: 'utf8', env, maxBuffer: 64 << 20 },
  );
  if (a.status !== 0) throw xcodeFailure('archive', a);
  collectDsyms(archive);
  const check = checkArchive(archive, version, build);
  if (!check.ok) {
    console.log(JSON.stringify({ version, build, archive, ...check }));
    process.exit(1);
  }

  // Export (or upload) for App Store Connect, signed for distribution by Xcode's automatic signing.
  const options = resolve(out, 'ExportOptions.plist');
  writeFileSync(
    options,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>${upload ? 'upload' : 'export'}</string>
  <key>teamID</key><string>${team}</string>
  <key>signingStyle</key><string>automatic</string>
  <key>uploadSymbols</key><true/>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict></plist>
`,
  );
  const result = spawnSync(
    'xcodebuild',
    [
      '-exportArchive',
      '-archivePath',
      archive,
      '-exportPath',
      out,
      '-exportOptionsPlist',
      options,
      '-allowProvisioningUpdates',
      ...apiKey(),
    ],
    { encoding: 'utf8', env, maxBuffer: 64 << 20 },
  );
  if (result.status !== 0) throw xcodeFailure(upload ? 'upload' : 'export', result);
  const ipa = resolve(out, 'BlokDust.ipa');
  console.log(
    JSON.stringify({
      ok: true,
      version,
      build,
      archive,
      ...(upload ? { uploaded: true } : { ipa: existsSync(ipa) ? ipa : null }),
      checks: check.checks,
    }),
  );
}
