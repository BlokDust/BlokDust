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
