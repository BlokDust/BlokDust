// bd win — run the Windows checks in the local Windows 11 VM (tools/win-vm; externally configured) and judge them here.
//   pnpm bd win engine    sync, MSVC x64 build, Catch2 suite, golden renders: hashes must equal tests/golden/expected
//   pnpm bd win plugin    sync web bundle + repo, build the VST3 (x64), pluginval, REAPER smoke test (load, editor, audio)
//   pnpm bd win package   the Windows installer: Release x64 build, Inno Setup (unsigned for Release 1) →
//                         build/plugin-release/dist/BlokDust-<version>-Windows.zip + .sha256: the installer .exe and
//                         a README.txt with the unsigned-installer steps (CHG-0005 task 12, CHG-0010)
//   pnpm bd win shot out.png
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** A JSON line from the VM's log, or `fallback` (with a warning) when it is cut off or garbled. */
function parsedOr(text: string, fallback: unknown, what: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error(`unreadable ${what} from the VM: ${String(error)}`);
    return fallback;
  }
}

const VM = 'tools/win-vm/vm.sh';
const vm = (...args: string[]) => spawnSync(VM, args, { encoding: 'utf8', maxBuffer: 64 << 20 });
const ps = (script: string, args = '') =>
  vm(
    'ssh',
    `powershell -NoProfile -ExecutionPolicy Bypass -File C:\\blokdust\\tools\\win-vm\\${script} ${args}`,
  );

function ensureUp() {
  if (vm('ssh', 'echo up').stdout.trim() === 'up') return;
  vm('start');
  for (let i = 0; i < 60; i++) {
    if (vm('ssh', 'echo up').stdout.trim() === 'up') return;
    spawnSync('sleep', ['10']);
  }
  throw new Error('VM did not come up (tools/win-vm/vm.sh status)');
}

function sync() {
  const result = vm('sync');
  if (!result.stdout.includes('synced')) throw new Error(`sync failed: ${result.stderr}`);
}

function engine() {
  ensureUp();
  sync();
  const result = ps('engine-check.ps1');
  const log = `${result.stdout}${result.stderr}`;
  mkdirSync('.cache', { recursive: true });
  writeFileSync('.cache/win-engine.log', log);
  const ctest = Number(/CTEST_EXIT (\d+)/.exec(log)?.[1] ?? -1);
  const testsLine =
    /(\d+)% tests passed, (\d+) tests failed out of (\d+)/.exec(log) ??
    /100% tests passed out of (\d+)/.exec(log);
  const renders = [...log.matchAll(/^RENDER (\S+) (.*)$/gm)].map((match) => {
    const exp = JSON.parse(readFileSync(join('tests/golden/expected', `${match[1]}.json`), 'utf8'));
    const got: any = parsedOr(match[2], {}, `RENDER ${match[1]}`);
    return {
      fixture: match[1],
      ok: got.audioHash === exp.audioHash && got.eventHash === exp.eventHash,
      audioHash: got.audioHash,
      expected: exp.audioHash,
    };
  });
  const ok = ctest === 0 && renders.length > 0 && renders.every((render) => render.ok);
  console.log(
    JSON.stringify({
      platform: 'windows-x64-msvc',
      ctestExit: ctest,
      tests: testsLine?.[0] ?? null,
      renders,
    }),
  );
  if (!ok) {
    console.error('see .cache/win-engine.log');
    process.exit(1);
  }
}

/** Sync the repo and the web bundle (gitignored, so not in the synced tree). `fresh`: build web/dist first. */
function syncWithWeb(fresh = false) {
  if (fresh || !existsSync('web/dist/index.html')) {
    if (spawnSync('pnpm', ['web:build'], { stdio: 'inherit' }).status)
      throw new Error('web build failed');
  }
  sync();
  const tar = spawnSync(
    'sh',
    ['-c', 'COPYFILE_DISABLE=1 tar -cf .cache/web-dist.tar -C web dist'],
    { encoding: 'utf8' },
  );
  if (tar.status) throw new Error(tar.stderr);
  vm('put', '.cache/web-dist.tar', 'web-dist.tar');
  vm('ssh', 'tar -xf "$env:USERPROFILE/web-dist.tar" -C C:\\blokdust\\web');
}

function packageWin() {
  ensureUp();
  syncWithWeb(true);
  const version = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;
  const result = ps('package.ps1', `-Version ${version}`);
  const log = `${result.stdout}${result.stderr}`;
  mkdirSync('.cache', { recursive: true });
  writeFileSync('.cache/win-package.log', log);
  const remote = /^PACKAGE (.*)$/m.exec(log)?.[1]?.trim();
  const fileVersions = [...log.matchAll(/^FILEVERSION (\S+) (.*)$/gm)].map((match) => ({
    file: match[2].trim(),
    version: match[1],
  }));
  if (!remote) {
    console.error('see .cache/win-package.log');
    process.exit(1);
  }
  const out = resolve('build/plugin-release/dist'),
    local = join(out, `BlokDust-${version}-Windows.exe`);
  mkdirSync(out, { recursive: true });
  vm('get', remote.replace(/\\/g, '/'), local);
  if (!existsSync(local)) throw new Error('copy back failed');
  // The download is a zip: the installer plus README.txt, which says how to get past SmartScreen while the installer
  // is unsigned (CHG-0010; the site no longer carries that text).
  const zipName = `BlokDust-${version}-Windows.zip`,
    zip = join(out, zipName),
    readme = join(out, 'README.txt');
  writeFileSync(
    readme,
    readFileSync('tools/win-vm/README-windows.txt', 'utf8')
      .replaceAll('{{VERSION}}', version)
      .replace(/\n/g, '\r\n'),
  );
  rmSync(zip, { force: true });
  if (spawnSync('zip', ['-j', '-X', '-q', zip, local, readme]).status !== 0)
    throw new Error('zip failed');
  rmSync(readme);
  const sha = spawnSync('shasum', ['-a', '256', zip], { encoding: 'utf8' }).stdout.split(/\s+/)[0];
  writeFileSync(`${zip}.sha256`, `${sha}  ${zipName}\n`);
  const versionsOk =
    fileVersions.length === 1 &&
    fileVersions.every((fileVersion) => fileVersion.version.startsWith(version));
  // Installs where DAWs look, and uninstalls cleanly (silent, in the VM).
  const ic = ps('install-check.ps1', `-Installer "${remote}"`);
  const install: any = parsedOr(
    /INSTALL_RESULT (.*)$/m.exec(`${ic.stdout}${ic.stderr}`)?.[1] ?? 'null',
    null,
    'INSTALL_RESULT',
  );
  const installOk =
    !!install &&
    install.installed.exit === 0 &&
    Object.values(install.installed).every((v) => v === true || v === 0) &&
    install.uninstallExit === 0 &&
    install.removed;
  console.log(
    JSON.stringify({ zip, exe: local, version, sha256: sha, fileVersions, install, signed: false }),
  );
  if (!versionsOk || !installOk) process.exit(1);
}

function plugin() {
  ensureUp();
  syncWithWeb();
  const result = ps('plugin-check.ps1');
  const log = `${result.stdout}${result.stderr}`;
  writeFileSync('.cache/win-plugin.log', log);
  const reaper = /REAPER_RESULT (.*)$/m.exec(log)?.[1];
  const reaperJson: any = reaper ? parsedOr(reaper, null, 'REAPER result') : null;
  const hosts = [...log.matchAll(/^HOST (\S+) (\S+) (.*)$/gm)].map((match) => {
    const exp = JSON.parse(readFileSync(join('tests/golden/expected', `${match[2]}.json`), 'utf8'));
    const got: any = parsedOr(match[3], {}, `HOST ${match[1]}`);
    return {
      case: match[1],
      ok: got.audioHash === exp.audioHash,
      audioHash: got.audioHash ?? match[3].slice(0, 120),
    };
  });
  const editorLine = [...log.matchAll(/^EDITOR (\{.*\})$/gm)]
    .map((match) => {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    })
    .find(Boolean);
  const editorBlocks = editorLine?.editor?.blocks ?? null;
  const pluginval = Object.fromEntries(
    [...log.matchAll(/^PLUGINVAL (\S+) (\d+)$/gm)].map((match) => [
      match[1],
      match[2] === '0' ? 'pass' : `fail (exit ${match[2]})`,
    ]),
  );
  const standalone: any = parsedOr(
    /STANDALONE_RESULT (.*)$/m.exec(log)?.[1] ?? 'null',
    null,
    'STANDALONE_RESULT',
  );
  const tagged = (t: string) => {
    try {
      return JSON.parse(new RegExp(`${t} (.*)$`, 'm').exec(log)?.[1] ?? 'null');
    } catch {
      return null;
    }
  };
  const mpe = tagged('REAPER_MPE'),
    fxRun = tagged('REAPER_FX'),
    state = tagged('REAPER_STATE');
  const reaperModes = {
    mpe: !!(mpe?.loaded && mpe?.midiItem && mpe?.peak > 0.001),
    fx: !!(fxRun?.loaded && fxRun?.peak > 0.001),
    state: !!(
      state?.loaded &&
      state?.reopened?.fxCount === 1 &&
      Math.abs((state?.reopened?.dust1 ?? -1) - 0.6) < 0.01
    ),
  };
  const ok =
    Object.keys(pluginval).length === 2 &&
    Object.values(pluginval).every((v) => v === 'pass') &&
    reaperJson?.loaded &&
    reaperJson?.peak > 0.001 &&
    Object.values(reaperModes).every(Boolean) &&
    hosts.length === 5 &&
    hosts.every((host) => host.ok) &&
    editorBlocks === 2 &&
    standalone?.alive === true;
  console.log(
    JSON.stringify({
      platform: 'windows-x64-msvc',
      hostRenders: hosts,
      editorBlocks,
      pluginval,
      reaper: reaperJson,
      reaperModes,
      reaperRuns: { mpe, fx: fxRun, state },
      standalone,
    }),
  );
  if (!ok) {
    console.error('see .cache/win-plugin.log');
    process.exit(1);
  }
}

const cmd = process.argv[2];
if (cmd === 'engine') engine();
else if (cmd === 'plugin') plugin();
else if (cmd === 'package') packageWin();
else if (cmd === 'shot') {
  ensureUp();
  console.log(vm('shot', resolve(process.argv[3] ?? '.cache/win-screen.png')).stdout.trim());
} // QEMU resolves paths from its own cwd
else {
  console.error('usage: bd win engine | plugin | package | shot [out.png]');
  process.exit(2);
}
