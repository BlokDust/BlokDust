// bd plugin reaper (macOS): the plugins in REAPER, as a DAW user runs them.
import { spawn, spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { ART, FX_ART, FX_VST3, VST3 } from './paths.ts';
import { build } from './build.ts';

/**
 * REAPER on macOS (CHG-0004 3.10): an isolated REAPER (its own resource folder via -cfgfile: your REAPER settings are
 * untouched) loads the built plugins from the build folder and runs tools/reaper/__startup.lua plans: instrument
 * playback, an MPE MIDI item, the FX on a tone generator, and a project saved and reopened with Dust 1 set.
 */
export async function reaperMac() {
  if (process.platform !== 'darwin') throw new Error('macOS only (Windows: bd win plugin)');
  const app = '/Applications/REAPER.app/Contents/MacOS/REAPER';
  if (!existsSync(app)) throw new Error('REAPER is not installed');
  if (!existsSync(VST3) || !existsSync(FX_VST3)) build();
  // REAPER's evaluation dialog (trial) holds every start until "Still evaluating" is pressed: a helper presses it. It
  // needs Accessibility access once (a stable path, so the grant survives rebuilds).
  const tools = resolve('.cache/reaper-tools'),
    click = join(tools, 'evaluation-click');
  mkdirSync(tools, { recursive: true });
  if (
    !existsSync(click) ||
    statSync(click).mtimeMs < statSync('tools/reaper/evaluation-click.swift').mtimeMs
  )
    if (
      spawnSync('swiftc', ['-O', 'tools/reaper/evaluation-click.swift', '-o', click], {
        stdio: 'inherit',
      }).status !== 0
    )
      throw new Error('evaluation-click build failed');
  if (spawnSync(click, ['0'], { encoding: 'utf8' }).status === 2)
    throw new Error(
      `REAPER automation needs Accessibility access for ${click} (System Settings › Privacy & Security › Accessibility › +), once`,
    );
  const home = resolve('.cache/reaper-home');
  rmSync(home, { recursive: true, force: true });
  mkdirSync(join(home, 'Scripts'), { recursive: true });
  mkdirSync(join(home, 'Effects', 'synthesis'), { recursive: true });
  cpSync('tools/reaper/__startup.lua', join(home, 'Scripts', '__startup.lua'));
  cpSync(
    '/Applications/REAPER.app/Contents/InstallFiles/Effects/synthesis/tonegenerator',
    join(home, 'Effects', 'synthesis', 'tonegenerator'),
  );
  const vstDirs = [resolve(ART, 'VST3'), resolve(FX_ART, 'VST3')].join(';');
  const ini = join(home, 'reaper.ini');
  writeFileSync(
    ini,
    `[REAPER]\nvstpath=${vstDirs}\nvstpath64=${vstDirs}\nvstpath_arm64=${vstDirs}\nsplashscreen=0\nnewprojdo=0\nloadlastproj=0\nverchk=0\n` +
      // The default system devices, as a fresh REAPER would ask for (the question would hold the start).
      'coreaudioindevnew=<default system devices>\ncoreaudiooutdevnew=<default system devices>\ncoreaudiosrate=48000\ncoreaudiobs=512\n',
  );
  const plans = [
    {
      name: 'instrument plays',
      fx: 'VST3i:BlokDust',
      mode: 'play',
      seconds: 6,
      ok: (r: any) => r.loaded && r.peak > 0.001,
    },
    {
      name: 'MPE MIDI item plays',
      fx: 'VST3i:BlokDust',
      mode: 'mpe',
      seconds: 4,
      ok: (r: any) => r.loaded && r.midiItem && r.peak > 0.001,
    },
    {
      name: 'FX: tone generator through Audio In',
      fx: 'VST3:BlokDust FX',
      mode: 'fx',
      seconds: 4,
      ok: (r: any) => r.loaded && r.peak > 0.001,
    },
    {
      name: 'project saved and reopened (state, Dust 1)',
      fx: 'VST3i:BlokDust',
      mode: 'state',
      seconds: 1,
      ok: (r: any) =>
        r.loaded &&
        r.reopened?.fxCount === 1 &&
        /BlokDust/.test(r.reopened.fx) &&
        Math.abs(r.reopened.dust1 - 0.6) < 0.01,
    },
  ];
  const results: any[] = [];
  for (const p of plans) {
    const report = join(home, 'blokdust-reaper-report.json');
    rmSync(report, { force: true });
    writeFileSync(
      join(home, 'blokdust-reaper-plan.txt'),
      `fx=${p.fx}\nseconds=${p.seconds}\nmode=${p.mode}\nquit=1\n`,
    );
    const child = spawn(app, ['-cfgfile', ini, '-newinst', '-new'], {
      env: { ...process.env, BLOKDUST_REAPER_HOME: home },
      stdio: 'ignore',
      detached: true,
    });
    spawn(click, ['90'], { stdio: 'ignore', detached: true }).unref(); // presses "Still evaluating" when the dialog shows
    const deadline = Date.now() + (p.seconds + 120) * 1000; // first launch scans plugins
    while (Date.now() < deadline && !existsSync(report))
      await new Promise((resolve) => setTimeout(resolve, 500));
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      process.kill(-child.pid!, 'SIGTERM');
    } catch {
      /* quit already */
    }
    const r = existsSync(report)
      ? JSON.parse(readFileSync(report, 'utf8'))
      : { error: 'no report (REAPER did not run the plan)' };
    const ok = !r.error && p.ok(r);
    results.push({ case: p.name, ok, ...r });
    console.error(`${ok ? 'pass' : 'FAIL'} ${p.name} ${JSON.stringify(r)}`);
  }
  console.log(JSON.stringify({ reaper: results[0]?.reaper, results }));
  if (results.some((result) => !result.ok)) process.exit(1);
}
