// Which files a lint run looks at: every tracked file, or only what is staged for commit.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

export interface FileSelection {
  stagedOnly: boolean;
  files: string[];
}

function gitFileList(args: string[]): string[] {
  const result = spawnSync('git', [...args, '-z'], { encoding: 'utf8', maxBuffer: 256 << 20 });
  return result.stdout
    .split('\0')
    .filter(Boolean)
    .filter((file) => existsSync(file));
}

export function selectFiles(stagedOnly: boolean): FileSelection {
  const files = stagedOnly
    ? gitFileList(['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
    : gitFileList(['ls-files']);
  return { stagedOnly, files };
}

export function filesMatching(selection: FileSelection, pattern: RegExp): string[] {
  return selection.files.filter((file) => pattern.test(file));
}
