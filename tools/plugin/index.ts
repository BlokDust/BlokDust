// bd plugin — JUCE plugin build, pluginval, and headless host tests (CHG-0001 task 0.11).
//   pnpm bd plugin build      web bundle (if missing) + VST3/AU/Standalone via the `plugin` CMake preset
//   pnpm bd plugin validate   pluginval (strictness 5) on the VST3 (and AU when the host can see it)
//   pnpm bd plugin au         macOS: install the AU *temporarily* in ~/Library/Audio/Plug-Ins/Components, run auval and
//                             pluginval on it, render it in a JUCE host (must equal native), then uninstall it
//   pnpm bd plugin sign       macOS: Developer ID sign (hardened runtime), notarise with Apple (keychain profile, default
//                             `blokdust`), staple, Gatekeeper-check → build/plugin/dist/BlokDust-macOS.zip
//   pnpm bd plugin package   macOS installer: universal, macOS 11+, signed, BlokDust-<version>-Mac.pkg notarised + stapled
//                             (build/plugin-release/dist), with its .sha256 (CHG-0005 task 12)
//   pnpm bd plugin ios build|test|device [--no-build]|log|archive   iPadOS AUv3: Simulator build/test, an iPad, its log, the App Store build (CHG-0025; ios.ts)
//   pnpm bd plugin test       build + validate + load the BUILT VST3 like a DAW: golden fixtures must hash exactly
//                             like the native engine, and the WebView editor must build the stage from the patch
import { requiredSetting, setting } from '../lib/local-config.ts';
import { iosCommand } from './ios.ts';
import { build } from './build.ts';
import { deploy } from './deploy.ts';
import { validate } from './validate.ts';
import { test } from './test.ts';
import { au } from './au.ts';
import { sign } from './sign.ts';
import { packageMac } from './package.ts';
import { reaperMac } from './reaper.ts';

// Validators and test hosts never send the daily usage ping (SHARING-0010 R8): every child inherits this.
process.env.BLOKDUST_NO_TELEMETRY ??= '1';

const cmd = process.argv[2];

if (cmd === 'build') build();
else if (cmd === 'reaper') await reaperMac();
else if (cmd === 'deploy')
  deploy(process.argv.includes('--no-build'), process.argv.includes('--force'));
else if (cmd === 'validate') {
  const v = validate();
  console.log(JSON.stringify(v));
  if (v.vst3 !== 'pass') process.exit(1);
} else if (cmd === 'test') test();
else if (cmd === 'ios') iosCommand(process.argv.slice(3));
else if (cmd === 'au') au(process.argv.includes('--keep'));
else if (cmd === 'sign') {
  const arg = (k: string, d: string | (() => string)) => {
    const i = process.argv.indexOf(k);
    return i >= 0 ? process.argv[i + 1] : typeof d === 'function' ? d() : d;
  };
  sign(
    arg('--profile', setting('BLOKDUST_NOTARY_PROFILE', 'blokdust')),
    arg('--identity', () => requiredSetting('BLOKDUST_SIGNING_IDENTITY')),
  );
} else if (cmd === 'package') {
  const arg = (k: string, d: string | (() => string)) => {
    const i = process.argv.indexOf(k);
    return i >= 0 ? process.argv[i + 1] : typeof d === 'function' ? d() : d;
  };
  packageMac(
    arg('--profile', setting('BLOKDUST_NOTARY_PROFILE', 'blokdust')),
    arg('--identity', () => requiredSetting('BLOKDUST_SIGNING_IDENTITY')),
    arg('--installer-identity', () => requiredSetting('BLOKDUST_INSTALLER_IDENTITY')),
    process.argv.includes('--no-build'),
  );
} else {
  console.error(
    'usage: bd plugin build | package [--no-build] | validate | test | ios build|test|device [--no-build] | ios log | ios archive [--build N] [--upload] | au [--keep] | reaper | deploy [--no-build] | sign [--profile blokdust] [--identity ...]',
  );
  process.exit(2);
}
