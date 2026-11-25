// bd plugin ios build: the app with its AUv3 (`plugin-ios-sim` preset) and the test host app,
// and the iPad Simulator they run in.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { setting } from '../lib/local-config.ts';
import { must, run } from './ios-shared.ts';
import { APP, APPEX, HOST_APP } from './ios-paths.ts';

export function iosBuild(): void {
  if (process.platform !== 'darwin') throw new Error('the iPadOS build needs macOS with Xcode');
  if (!existsSync('web/dist/index.html')) must(run('pnpm', ['web:build']), 'web build');
  must(run('cmake', ['--preset', 'plugin-ios-sim']), 'configure (plugin-ios-sim)');
  // stderr kept quiet: Xcode prints every compile line; failures still show their errors.
  const b = run(
    'cmake',
    ['--build', '--preset', 'plugin-ios-sim', '--target', 'BlokDust_Standalone', '--', '-quiet'],
    true,
  );
  if (b.status !== 0) {
    const errors = `${b.stdout}\n${b.stderr}`
      .split('\n')
      .filter((line) => /error:|BUILD FAILED/.test(line));
    throw new Error(`iPadOS build failed:\n${[...new Set(errors)].slice(0, 30).join('\n')}`);
  }
  if (!existsSync(APPEX)) throw new Error(`no AUv3 inside the app: ${APPEX}`);
  // The test host: a plain UIKit app, compiled directly (no Xcode project), signed ad hoc for the Simulator.
  rmSync(HOST_APP, { recursive: true, force: true });
  mkdirSync(HOST_APP, { recursive: true });
  must(
    run(
      'xcrun',
      [
        '-sdk',
        'iphonesimulator',
        'clang++',
        '-std=c++20',
        '-fobjc-arc',
        '-O2',
        '-target',
        'arm64-apple-ios16.0-simulator',
        '-Iengine/include',
        'plugin/tests/ios-host/main.mm',
        '-framework',
        'UIKit',
        '-framework',
        'AVFoundation',
        '-framework',
        'AudioToolbox',
        '-framework',
        'CoreAudioKit',
        '-o',
        `${HOST_APP}/BlokDustIOSHost`,
      ],
      true,
    ),
    'test host compile',
  );
  cpSync('plugin/tests/ios-host/Info.plist', `${HOST_APP}/Info.plist`);
  must(run('codesign', ['--force', '--sign', '-', HOST_APP], true), 'test host signing');
  console.error(`built ${APP} (AUv3 inside) and ${HOST_APP}`);
}

/** An available iPad Simulator's UDID. */
export function simulator(): { udid: string; name: string } {
  const want = setting('BLOKDUST_IOS_SIMULATOR', 'iPad Pro 11-inch');
  const list = JSON.parse(
    must(run('xcrun', ['simctl', 'list', 'devices', 'available', '-j'], true), 'simctl list')
      .stdout,
  );
  const all = Object.entries(list.devices as Record<string, { udid: string; name: string }[]>)
    .filter(([rt]) => rt.includes('iOS'))
    .flatMap(([, ds]) => ds)
    .filter((device) => device.name.startsWith('iPad'));
  const chosen = all.find((x) => x.name.startsWith(want)) ?? all[0];
  if (!chosen)
    throw new Error(
      'no iPad Simulator available (Xcode → Settings → Components: install an iOS runtime)',
    );
  return chosen;
}
