// bd plugin validate: pluginval (strictness 5) on the VST3, and the AU when the host sees it.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { FX_VST3, PLUGINVAL, VST3, run } from './paths.ts';

export function validate(): Record<string, string> {
  if (!existsSync(PLUGINVAL)) {
    run('sh', [
      '-c',
      'mkdir -p .cache/pluginval && cd .cache/pluginval && gh release download v1.0.4 --repo Tracktion/pluginval --pattern pluginval_macOS.zip --clobber && unzip -q -o pluginval_macOS.zip',
    ]);
  }
  const out: Record<string, string> = {};
  for (const [name, path] of [
    ['vst3', VST3],
    ['fxVst3', FX_VST3],
  ] as const) {
    if (!existsSync(path)) {
      out[name] = 'not built';
      continue;
    }
    const result = run(
      PLUGINVAL,
      ['--strictness-level', '5', '--skip-gui-tests', '--validate', resolve(path)],
      true,
    );
    const log = `${result.stdout}${result.stderr}`;
    out[name] =
      result.status === 0
        ? 'pass'
        : /No types found|Unable to load|not found/i.test(log)
          ? 'not loadable from build dir'
          : `fail (exit ${result.status})`;
    if (result.status !== 0)
      console.error(`--- pluginval ${name} ---\n${log.split('\n').slice(-25).join('\n')}`);
  }
  return out;
}
