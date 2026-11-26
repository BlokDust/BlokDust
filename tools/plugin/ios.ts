// bd plugin ios — the iPadOS AUv3 (CHG-0025) in the iOS Simulator.
//   pnpm bd plugin ios build   web bundle (if missing) + BlokDust.app with the AUv3 inside (`plugin-ios-sim` preset,
//                              Xcode generator) + the test host app (plugin/tests/ios-host)
//   pnpm bd plugin ios test    build, boot an iPad Simulator, install both apps, and let the test host load the AUv3 out
//                              of process like AUM: golden fixtures must hash exactly like the native engine, state must
//                              round-trip, and the editor's page must report bd_ready with the patch's blocks.
//                              First the app itself (task 4): installed fresh, it must start output-only audio with no
//                              microphone entry, show the first-launch patch, save it when sent to the background, and
//                              restore it on the next launch. A patch put in the App Group's Patches folder must be
//                              seen by both the app and the extension (task 5: one folder shared by both), and a patch
//                              from another machine must find its sample there by name and render like native (task 6).
//                              BlokDust FX, the app's second extension, renders its fixture with input ≡ golden (task 9).
//   --no-build                 test the existing build
//   pnpm bd plugin ios device|log   the real iPad: tools/plugin/ios-device.ts
//   pnpm bd plugin ios archive      the App Store build: tools/plugin/ios-release.ts
// The Simulator is picked by name: BLOKDUST_IOS_SIMULATOR (local config) or the first available "iPad Pro 11-inch".
import { iosDevice, iosLog } from './ios-device.ts';
import { iosArchive } from './ios-release.ts';
import { iosBuild } from './ios-build.ts';
import { iosTest } from './ios-test.ts';

/** `bd plugin ios <command> …` */
export function iosCommand(args: string[]): void {
  const [command, ...rest] = args;
  const noBuild = rest.includes('--no-build');
  if (command === 'build') iosBuild();
  else if (command === 'test') iosTest(noBuild);
  else if (command === 'device') iosDevice(noBuild);
  else if (command === 'log') iosLog();
  else if (command === 'archive') iosArchive(rest);
  else
    throw new Error(
      'usage: bd plugin ios build | test [--no-build] | device [--no-build] | log | archive [--build N] [--upload]',
    );
}
