// bd plugin au (macOS): install the AU for a while, run auval and pluginval, render it in a JUCE
// host (must equal native), then uninstall it.
import { cpSync, existsSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { AU, FX_AU, PLUGINVAL, run } from './paths.ts';
import { build } from './build.ts';
import { expected, hostRender } from './hostRender.ts';

export function au(keep = false) {
  if (process.platform !== 'darwin') throw new Error('AU is macOS only');
  if (!existsSync(AU) || !existsSync(FX_AU)) build();
  const dir = join(homedir(), 'Library/Audio/Plug-Ins/Components');
  // type/subtype/manufacturer = AU_MAIN_TYPE / PLUGIN_CODE / PLUGIN_MANUFACTURER_CODE (plugin/CMakeLists.txt)
  const plugins = [
    {
      src: AU,
      dest: join(dir, 'BlokDust.component'),
      auval: ['aumu', 'Bdst', 'Bldt'],
      id: 'AudioUnit:Synths/aumu,Bdst,Bldt',
      fixture: 'tests/golden/plugin-start.json',
    },
    {
      src: FX_AU,
      dest: join(dir, 'BlokDust FX.component'),
      auval: ['aufx', 'Bdfx', 'Bldt'],
      id: 'AudioUnit:Effects/aufx,Bdfx,Bldt',
      fixture: 'tests/golden/fx-demo.json',
    },
  ];
  for (const p of plugins)
    if (existsSync(p.dest) && !keep)
      throw new Error(`${p.dest} already exists; not touching an install this tool did not make`);
  // macOS caches the AU list
  const refresh = () => run('killall', ['-9', 'AudioComponentRegistrar'], true);
  const results: any[] = [];
  try {
    for (const p of plugins) {
      rmSync(p.dest, { recursive: true, force: true });
      cpSync(p.src, p.dest, { recursive: true });
    }
    refresh();
    for (const p of plugins) {
      const r: any = { plugin: p.id };
      const auval = run('auval', ['-v', ...p.auval], true);
      r.auval = auval.stdout.includes('AU VALIDATION SUCCEEDED') ? 'pass' : 'fail';
      if (r.auval !== 'pass') console.error(auval.stdout.split('\n').slice(-30).join('\n'));
      const pv = run(
        PLUGINVAL,
        ['--strictness-level', '5', '--skip-gui-tests', '--validate', p.dest],
        true,
      );
      r.pluginval = pv.status === 0 ? 'pass' : `fail (exit ${pv.status})`;
      if (pv.status !== 0)
        console.error(`${pv.stdout}${pv.stderr}`.split('\n').slice(-25).join('\n'));
      // The installed AU in a JUCE host with its default patch (AU state is a property list): must equal native.
      const got = hostRender(p.id, p.fixture, ['--no-state']);
      r.render = {
        ok: got.audioHash === expected(p.fixture).audioHash,
        audioHash: got.audioHash ?? got.error,
      };
      results.push(r);
    }
  } finally {
    if (!keep) {
      for (const p of plugins) rmSync(p.dest, { recursive: true, force: true });
      refresh();
    }
  }
  console.log(JSON.stringify({ results, installed: keep ? 'kept' : 'removed after the test' }));
  if (
    results.some(
      (result) => result.auval !== 'pass' || result.pluginval !== 'pass' || !result.render.ok,
    )
  )
    process.exit(1);
}
