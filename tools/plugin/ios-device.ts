// bd plugin ios device|log — the iPadOS app (CHG-0025) on the owner's real iPad.
//   pnpm bd plugin ios device   (task 10) build for an iPad with automatic signing (team BLOKDUST_APPLE_TEAM_ID; Xcode
//                              creates the app IDs, the App Group and profiles: needs an Apple account in Xcode →
//                              Settings → Accounts), then install on the connected iPad (BLOKDUST_IOS_DEVICE: a name or
//                              identifier, else the first paired iPad).
//   pnpm bd plugin ios log      the plugin's log from the iPad.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { configEnvironment, requiredSetting, setting } from '../lib/local-config.ts';
import { APP_ID, OUT, must, run } from './ios-shared.ts';
import { webBuildFor } from './web.ts';

const DEVICE_APP = 'build/plugin-ios/plugin/BlokDust_artefacts/Release/Standalone/BlokDust.app';

interface Ipad {
  identifier: string;
  deviceProperties: { name: string };
  hardwareProperties: { deviceType?: string; productType?: string; udid?: string };
  connectionProperties: { pairingState?: string };
}

/** The paired iPad: BLOKDUST_IOS_DEVICE (name or identifier), or the first one. */
function findIpad(): Ipad {
  const tmp = resolve(OUT, 'devices.json');
  mkdirSync(OUT, { recursive: true });
  must(
    run('xcrun', ['devicectl', 'list', 'devices', '--json-output', tmp], true),
    'devicectl list',
  );
  const devices = (JSON.parse(readFileSync(tmp, 'utf8')).result.devices as Ipad[]).filter(
    (ipad) => ipad.connectionProperties.pairingState === 'paired',
  );
  const want = setting('BLOKDUST_IOS_DEVICE');
  const ipad = want
    ? devices.find((device) => device.identifier === want || device.deviceProperties.name === want)
    : devices.find(
        (device) =>
          device.hardwareProperties.deviceType === 'iPad' ||
          (device.hardwareProperties.productType ?? '').startsWith('iPad'),
      );
  if (!ipad)
    throw new Error(
      'no paired iPad: connect it (USB or the same network), trust this Mac, and enable Developer Mode on it',
    );
  return ipad;
}

/** The plugin's log from the iPad, to stdout as JSON lines. The app and its extensions write it to the App Group
 * (WebViewDrops.mm), which devicectl cannot read; the app copies it into its own container each time it opens. */
export function iosLog(): void {
  const ipad = findIpad();
  const dest = resolve(OUT, 'ipad-log');
  mkdirSync(dest, { recursive: true });
  const lines: string[] = [];
  for (const name of ['blokdust.old.log', 'blokdust.log']) {
    const out = resolve(dest, name);
    rmSync(out, { force: true });
    run(
      'xcrun',
      [
        'devicectl',
        'device',
        'copy',
        'from',
        '--device',
        ipad.identifier,
        '--domain-type',
        'appDataContainer',
        '--domain-identifier',
        APP_ID,
        '--source',
        `Library/Logs/${name}`,
        '--destination',
        out,
      ],
      true,
    );
    if (existsSync(out)) lines.push(...readFileSync(out, 'utf8').split('\n').filter(Boolean));
  }
  if (!lines.length)
    throw new Error(
      "no log yet: open the BlokDust app on the iPad (it copies the plugin's log where this can read it)",
    );
  console.log(
    JSON.stringify({ ok: true, device: ipad.deviceProperties.name, lines: lines.slice(-300) }),
  );
}

/** Build for an iPad (signed by Xcode for the team in local config) and install it on the connected iPad. */
export function iosDevice(noBuild: boolean): void {
  if (process.platform !== 'darwin') throw new Error('the iPadOS build needs macOS with Xcode');
  // Find the iPad first: Xcode adds a device to the team's profile only when it builds for that device.
  const ipad = findIpad();
  if (!noBuild) {
    requiredSetting('BLOKDUST_APPLE_TEAM_ID');
    const env = configEnvironment();
    webBuildFor('staging'); // the owner reviews against staging (CHG-0039)
    // The sites whose passkeys the app may use (SHARING-0011): the live site and the review site (local config).
    env.BLOKDUST_WEBCREDENTIALS = ['BLOKDUST_PRODUCTION_PUBLIC_URL', 'BLOKDUST_STAGING_PUBLIC_URL']
      .map((k) => setting(k))
      .filter(Boolean)
      .map((u) => new URL(u).hostname)
      .join(';');
    // Once the App ID has Sign in with Apple and Associated Domains (the developer portal, or Xcode
    // signed in to the team): BLOKDUST_IOS_NATIVE_SIGN_IN=1 in local config builds them in.
    env.BLOKDUST_IOS_NATIVE_SIGN_IN = setting('BLOKDUST_IOS_NATIVE_SIGN_IN', '0');
    must(
      spawnSync('cmake', ['--preset', 'plugin-ios'], {
        stdio: ['ignore', 'inherit', 'inherit'],
        env,
      }),
      'configure (plugin-ios)',
    );
    // xcodebuild with the CMake-generated scheme and this iPad as the destination, so automatic signing registers the iPad
    // in the team's profile (a plain target build signs for whatever devices the profile already lists).
    const destination = ipad.hardwareProperties.udid
      ? `id=${ipad.hardwareProperties.udid}`
      : 'generic/platform=iOS';
    const b = spawnSync(
      'xcodebuild',
      [
        '-project',
        'build/plugin-ios/blokdust.xcodeproj',
        '-scheme',
        'BlokDust_Standalone',
        '-configuration',
        'Release',
        '-destination',
        destination,
        '-quiet',
        '-allowProvisioningUpdates',
        '-allowProvisioningDeviceRegistration',
        'build',
      ],
      { encoding: 'utf8', env, maxBuffer: 64 << 20 },
    );
    if (b.status !== 0) {
      const out = `${b.stdout}\n${b.stderr}`;
      const errors = [...new Set(out.split('\n').filter((l) => /error:|BUILD FAILED/.test(l)))]
        .slice(0, 20)
        .join('\n');
      const account =
        /No Accounts|No Account for Team|No profiles for|App Groups capability|requires a provisioning profile|Signing for .* requires a development team/.test(
          out,
        )
          ? '\nXcode could not sign: add the Apple account of the team in Xcode → Settings → Accounts, then run this again.'
          : '';
      throw new Error(`iPadOS device build failed:\n${errors}${account}`);
    }
  }
  if (!existsSync(DEVICE_APP))
    throw new Error(`missing ${DEVICE_APP}: run pnpm bd plugin ios device`);
  must(
    run('xcrun', [
      'devicectl',
      'device',
      'install',
      'app',
      '--device',
      ipad.identifier,
      DEVICE_APP,
    ]),
    'install on the iPad',
  );
  console.log(
    JSON.stringify({ ok: true, installed: DEVICE_APP, device: ipad.deviceProperties.name }),
  );
}
