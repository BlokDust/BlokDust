// bd plugin build: the web bundle if missing, then VST3, AU and Standalone (the `plugin` preset).
import { existsSync } from 'node:fs';
import { AU, FX_AU, FX_VST3, VST3, run } from './paths.ts';

export function build() {
  if (!existsSync('web/dist/index.html')) {
    if (run('pnpm', ['web:build']).status !== 0) throw new Error('web build failed');
  }
  if (run('cmake', ['--preset', 'plugin']).status !== 0) throw new Error('configure failed');
  if (run('cmake', ['--build', '--preset', 'plugin', '-j', '8']).status !== 0)
    throw new Error('plugin build failed');
  if (process.platform === 'darwin') resignAdHoc();
}

/** The four plugin bundles (macOS). */
export const BUNDLES = () => [VST3, AU, FX_VST3, FX_AU];

/**
 * JUCE rewrites files inside the AU bundles after signing them, leaving "code has no resources but signature
 * indicates they must be present": macOS then refuses to load them in other processes (Logic shows nothing, no
 * error). Re-sign every bundle ad hoc after each build and verify (release signing is `bd plugin sign`).
 */
export function resignAdHoc(): void {
  for (const b of BUNDLES()) {
    if (!existsSync(b)) continue;
    if (run('codesign', ['--force', '--deep', '--sign', '-', b], true).status !== 0)
      throw new Error(`codesign failed: ${b}`);
    const result = run('codesign', ['-v', b], true);
    if (result.status !== 0)
      throw new Error(`invalid signature after re-signing ${b}: ${result.stderr}`);
  }
}
