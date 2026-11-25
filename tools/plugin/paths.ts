// Where the plugin build puts things, the release version, and how the tool runs commands.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const ART = 'build/plugin/plugin/BlokDust_artefacts/Release';

export const VST3 = `${ART}/VST3/BlokDust.vst3`;

export const AU = `${ART}/AU/BlokDust.component`;

export const FX_ART = 'build/plugin/plugin/BlokDustFX_artefacts/Release';

export const FX_VST3 = `${FX_ART}/VST3/BlokDust FX.vst3`;

export const FX_AU = `${FX_ART}/AU/BlokDust FX.component`;

export const HOST = 'build/plugin/plugin/blokdust_host_test_artefacts/Release/blokdust_host_test';

export const PLUGINVAL = '.cache/pluginval/pluginval.app/Contents/MacOS/pluginval';

export const run = (cmd: string, args: string[], quiet = false) =>
  spawnSync(cmd, args, {
    encoding: 'utf8',
    stdio: quiet ? 'pipe' : ['ignore', 'inherit', 'inherit'],
  });

/** The release version: the root package.json's (CMake reads the same field). */
export const VERSION = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string })
  .version;
