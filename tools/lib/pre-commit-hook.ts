// The one pre-commit hook every checkout of the clone shares: `bd size` and `bd lint` on the staged files.
import { spawnSync } from 'node:child_process';
import { chmodSync, writeFileSync } from 'node:fs';

// Hooks are shared by every worktree: branches without a tool commit without that check.
const HOOK_SCRIPT = `#!/bin/sh
# bd size and bd lint (CHG-0045) on the staged files. Install: pnpm bd lint install
set -e
if [ -f tools/size/index.ts ]; then node tools/bd.ts size check --staged; fi
if [ -f tools/lint/index.ts ]; then node tools/bd.ts lint --staged; fi
`;

export function installPreCommitHook(): string {
  const gitPath = spawnSync('git', ['rev-parse', '--git-path', 'hooks/pre-commit'], {
    encoding: 'utf8',
  });
  const hookPath = gitPath.stdout.trim() || '.git/hooks/pre-commit';
  writeFileSync(hookPath, HOOK_SCRIPT);
  chmodSync(hookPath, 0o755);
  return hookPath;
}
