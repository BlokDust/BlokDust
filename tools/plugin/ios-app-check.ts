// The app's own checks (tasks 4–6): first launch, saving and restoring, the shared Patches folder,
// and a patch from another machine finding its sample there by name.
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { APP_ID, OUT, must, run } from './ios-shared.ts';
import {
  APP,
  APPEX,
  FIRST_PATCH,
  FX_APPEX,
  SAMPLE_FIXTURE,
  STATS_ASKED,
  STATS_FILE,
  sleep,
  statsFile,
} from './ios-paths.ts';
import { appLog, waitForLog } from './ios-log.ts';

/** The sample fixture as a patch from another machine, its WAV in the App Group's Samples folder; and the native hash. */
export function sampleRelinkFixture(group: string): { fixture: string; expected: string } {
  const fx = JSON.parse(readFileSync(SAMPLE_FIXTURE, 'utf8'));
  for (const r of Object.values(fx.patch.refs) as {
    provider: string;
    name: string;
    path: string;
  }[])
    if (r.provider === 'file') {
      mkdirSync(resolve(group, 'BlokDust/Samples'), { recursive: true });
      cpSync(resolve(r.path), resolve(group, 'BlokDust/Samples', r.name));
      r.path = `/Volumes/Elsewhere/Samples/${r.name}`; // a path that exists on no iPad
    }
  const fixture = resolve(OUT, 'sample-relink.json');
  writeFileSync(fixture, JSON.stringify(fx));
  const native = JSON.parse(
    must(run('node', ['tools/bd.ts', 'render', SAMPLE_FIXTURE], true), 'native render (sample)')
      .stdout.trim()
      .split('\n')
      .pop()!,
  );
  return { fixture, expected: native.audioHash };
}

/** The app on its own (CHG-0025 task 4): output-only audio, the first-launch patch, saved and restored. */
export function appCheck(udid: string, group: string) {
  const plist = JSON.parse(
    must(
      run('plutil', ['-convert', 'json', '-o', '-', `${APP}/Info.plist`], true),
      'read Info.plist',
    ).stdout,
  );
  const appexPlist = JSON.parse(
    must(
      run('plutil', ['-convert', 'json', '-o', '-', `${APPEX}/Info.plist`], true),
      'read appex Info.plist',
    ).stdout,
  );
  const noMicrophone =
    !('NSMicrophoneUsageDescription' in plist) && !('NSMicrophoneUsageDescription' in appexPlist);
  // The privacy manifest (CHG-0025 task 12c) in the app and both extensions, a valid plist that declares no tracking.
  // App Store Connect (task 12b): standard HTTPS only, declared so uploads skip the export question; one build number.
  const fxPlist = JSON.parse(
    must(
      run('plutil', ['-convert', 'json', '-o', '-', `${FX_APPEX}/Info.plist`], true),
      'read FX Info.plist',
    ).stdout,
  );
  // Each extension's ID is the app's plus one part (the App Store refused
  // com.funputs.blokdust.fx.fxAUv3).
  const appStorePlist =
    plist.ITSAppUsesNonExemptEncryption === false &&
    [appexPlist, fxPlist].every(
      (p) =>
        p.CFBundleVersion === plist.CFBundleVersion &&
        p.CFBundleShortVersionString === plist.CFBundleShortVersionString &&
        new RegExp(`^${plist.CFBundleIdentifier.replace(/\./g, '\\.')}\\.[^.]+$`).test(
          p.CFBundleIdentifier,
        ),
    );
  const privacyManifest = [APP, APPEX, FX_APPEX].every((b) => {
    const result = run(
      'plutil',
      ['-convert', 'json', '-o', '-', `${b}/PrivacyInfo.xcprivacy`],
      true,
    );
    try {
      return result.status === 0 && JSON.parse(result.stdout).NSPrivacyTracking === false;
    } catch {
      return false;
    }
  });
  const firstBlocks = JSON.parse(readFileSync(FIRST_PATCH, 'utf8')).blocks.length;

  const t1 = new Date(Date.now() - 1000);
  must(
    run('xcrun', ['simctl', 'launch', '--terminate-running-process', udid, APP_ID], true),
    'launch BlokDust.app',
  );
  const log1 = waitForLog(udid, t1, [/container: audio running/, /page: ready, \d+ blocks/], 60);
  const session = /container: audio started \((\w+), (\d+) Hz, (\d+) frames\)/.exec(log1);
  const peak = Number(/container: audio running, peak ([\d.]+)/.exec(log1)?.[1] ?? 0);
  const ready = Number(/page: ready, (-?\d+) blocks/.exec(log1)?.[1] ?? -1);
  const shot = resolve(OUT, 'app.png');
  run('xcrun', ['simctl', 'io', udid, 'screenshot', shot], true);

  // To the background (another app in front): the app saves its patch. Then a fresh launch must restore it.
  const t2 = new Date(Date.now() - 1000);
  run('xcrun', ['simctl', 'launch', udid, 'com.apple.Preferences'], true);
  const saved = waitForLog(udid, t2, [/container: patch saved/], 20).includes(
    'container: patch saved',
  );
  // Meanwhile another BlokDust switches usage stats on; the same app process, back in front, asks exactly once.
  writeFileSync(resolve(group, STATS_FILE), statsFile(true));
  const t4 = new Date();
  run('xcrun', ['simctl', 'launch', udid, APP_ID], true);
  sleep(1000);
  const back = waitForLog(udid, t4, [STATS_ASKED], 20);
  sleep(2000);
  const again = appLog(udid, t4);
  const usageStatsFollows =
    again.split('values: usageStats=1').length === 2 && !back.includes('processor created');
  writeFileSync(resolve(group, STATS_FILE), statsFile(false));
  run('xcrun', ['simctl', 'terminate', udid, 'com.apple.Preferences'], true);
  run('xcrun', ['simctl', 'terminate', udid, APP_ID], true);
  const t3 = new Date(Date.now() - 1000);
  must(run('xcrun', ['simctl', 'launch', udid, APP_ID], true), 'relaunch BlokDust.app');
  const log3 = waitForLog(udid, t3, [/container: patch restored/, /page: ready, \d+ blocks/], 60);
  const restored = log3.includes('container: patch restored');
  const readyAgain = Number(/page: ready, (-?\d+) blocks/.exec(log3)?.[1] ?? -1);
  run('xcrun', ['simctl', 'terminate', udid, APP_ID], true);

  const sharedFolder = log1.includes('storage: app group, 1 patches');
  const usageStatsShared = log1.includes('usage stats: app group, off');
  const ok =
    sharedFolder &&
    usageStatsShared &&
    usageStatsFollows &&
    privacyManifest &&
    appStorePlist &&
    noMicrophone &&
    session?.[1] === 'AVAudioSessionCategoryPlayback' &&
    peak > 0 &&
    ready === firstBlocks &&
    saved &&
    restored &&
    readyAgain === firstBlocks;
  return {
    ok,
    sharedFolder,
    usageStatsShared,
    usageStatsFollows,
    privacyManifest,
    appStorePlist,
    noMicrophone,
    session: session?.[1] ?? null,
    sampleRate: Number(session?.[2] ?? 0),
    frames: Number(session?.[3] ?? 0),
    peak,
    ready,
    expectedBlocks: firstBlocks,
    saved,
    restored,
    readyAfterRelaunch: readyAgain,
    screenshot: shot,
  };
}
