// bd plugin au (macOS): install the AU for a while, run auval and pluginval, render it in a JUCE
// host (must equal native), then uninstall it.
import { cpSync, existsSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { AU, FX_AU, PLUGINVAL, run } from './paths.ts';
import { build } from './build.ts';
import { expected, hostRender } from './hostRender.ts';

/** One AU's results, in the order they are found. */
interface AuReport {
  plugin: string;
  auval: string;
  pluginval: string;
  render: { ok: boolean; audioHash: string | undefined };
}

export function au(keep = false) {
  if (process.platform !== 'darwin') throw new Error('AU is macOS only');
  if (!existsSync(AU) || !existsSync(FX_AU)) build();
  const dir = join(homedir(), 'Library/Audio/Plug-Ins/Components');
  // AU type, subtype, maker: AU_MAIN_TYPE, PLUGIN_CODE and PLUGIN_MANUFACTURER_CODE in
  // plugin/CMakeLists.txt
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
  for (const unit of plugins)
    if (existsSync(unit.dest) && !keep)
      throw new Error(
        `${unit.dest} already exists; not touching an install this tool did not make`,
      );
  // macOS caches the AU list
  const refresh = () => run('killall', ['-9', 'AudioComponentRegistrar'], true);
  const results: AuReport[] = [];
  try {
    for (const install of plugins) {
      rmSync(install.dest, { recursive: true, force: true });
      cpSync(install.src, install.dest, { recursive: true });
    }
    refresh();
    for (const component of plugins) {
      const auval = run('auval', ['-v', ...component.auval], true);
      const auvalResult = auval.stdout.includes('AU VALIDATION SUCCEEDED') ? 'pass' : 'fail';
      if (auvalResult !== 'pass') console.error(auval.stdout.split('\n').slice(-30).join('\n'));
      const pv = run(
        PLUGINVAL,
        ['--strictness-level', '5', '--skip-gui-tests', '--validate', component.dest],
        true,
      );
      if (pv.status !== 0)
        console.error(`${pv.stdout}${pv.stderr}`.split('\n').slice(-25).join('\n'));
      // The installed AU in a JUCE host with its default patch (a property list) must equal native.
      const got = hostRender(component.id, component.fixture, ['--no-state']);
      results.push({
        plugin: component.id,
        auval: auvalResult,
        pluginval: pv.status === 0 ? 'pass' : `fail (exit ${pv.status})`,
        render: {
          ok: got.audioHash === expected(component.fixture).audioHash,
          audioHash: got.audioHash ?? got.error,
        },
      });
    }
  } finally {
    if (!keep) {
      for (const installed of plugins) rmSync(installed.dest, { recursive: true, force: true });
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
