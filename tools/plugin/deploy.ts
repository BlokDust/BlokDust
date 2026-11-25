// bd plugin deploy: ship the plugins to the externally configured test host.
import { requiredSetting } from '../lib/local-config.ts';
import { webBuildFor } from './web.ts';
import { existsSync } from 'node:fs';
import { run } from './paths.ts';
import { BUNDLES, build, resignAdHoc } from './build.ts';

/** Deploy to the externally configured SSH test host. See docs/engineering/local-configuration.md. */
export function deploy(noBuild: boolean, force = false): void {
  const host = requiredSetting('BLOKDUST_TEST_HOST');
  if (!noBuild) {
    webBuildFor('staging');
    build();
  } else resignAdHoc(); // the owner reviews against staging (CHG-0039)
  for (const b of BUNDLES())
    if (!existsSync(b)) throw new Error(`no ${b}: build first (pnpm bd plugin build)`);
  const ssh = (cmd: string) =>
    run('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', host, cmd], true);
  if (ssh('true').status !== 0)
    throw new Error(
      `cannot reach ${host} over SSH (Remote Login on, this machine's key in its authorized_keys?)`,
    );
  // Owner (Logic, 2026-11-12): replacing a plugin a DAW has loaded (and resetting the AU registry under it) leaves that
  // session broken in ways that look like plugin bugs. Refuse while any process there has a BlokDust binary mapped.
  const busy = ssh(
    `for p in $(pgrep -f "Logic Pro|Ableton Live|REAPER|GarageBand|AUHostingService|Bitwig"); do lsof -p "$p" 2>/dev/null | grep -q "/BlokDust" && ps -o comm= -p "$p" | xargs basename; done | sort -u`,
  );
  const users = busy.stdout.trim().split('\n').filter(Boolean);
  if (users.length && !force)
    throw new Error(
      `BlokDust is loaded on ${host} by: ${users.join(', ')}. Quit it there first (or --force)`,
    );
  ssh('mkdir -p ~/Library/Audio/Plug-Ins/VST3 ~/Library/Audio/Plug-Ins/Components');
  const shipped: string[] = [];
  for (const b of BUNDLES()) {
    const dest = b.endsWith('.vst3')
      ? 'Library/Audio/Plug-Ins/VST3/'
      : 'Library/Audio/Plug-Ins/Components/';
    // Compare contents so rewritten signature/resource files cannot be skipped on matching size/mtime.
    const result = run('rsync', ['-a', '--checksum', '--delete', b, `${host}:${dest}`], true);
    if (result.status !== 0) throw new Error(`rsync failed for ${b}: ${result.stderr}`);
    shipped.push(dest + b.split('/').pop());
  }
  const quoted = shipped.map((path) => `"$HOME/${path}"`).join(' ');
  ssh(`xattr -dr com.apple.quarantine ${quoted} 2>/dev/null || true`);
  const verify = ssh(`for b in ${quoted}; do codesign -v "$b" || exit 1; done`);
  if (verify.status !== 0)
    throw new Error(
      `a deployed bundle has an invalid signature on ${host}: the DAW would silently skip it\n${verify.stderr}`,
    );
  ssh('killall -9 AudioComponentRegistrar 2>/dev/null || true'); // Logic re-reads the AU list
  const rev = run('git', ['rev-parse', '--short', 'HEAD'], true).stdout.trim();
  console.log(JSON.stringify({ host, deployed: shipped, signatures: 'valid', commit: rev }));
  console.error(
    `Deployed ${rev} to ${host}. Logic uses the AUs (BlokDust, BlokDust FX); Live the VST3s. AU validation on that machine must run in Terminal.app (an SSH session can't see AUs): auval -v aumu Bdst Bldt`,
  );
}
