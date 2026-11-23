// The checks `bd lint` runs. Each one reports to stderr and returns whether it passed.
import { spawnSync } from 'node:child_process';
import { filesMatching, type FileSelection } from './files.ts';

export interface CheckOptions {
  fix: boolean;
}

export interface LintCheck {
  name: string;
  run: (selection: FileSelection, options: CheckOptions) => CheckOutcome;
}

export type CheckOutcome = 'pass' | 'fail' | 'skip';

const TYPESCRIPT_SOURCE = /\.(ts|tsx|mts|cts|astro)$/;
const ESLINT_SOURCE = /\.(ts|tsx|mts|cts|js|mjs|cjs|astro)$/;
// Type-aware rules need every project's types, even for one staged file; keep argument lists short.
const MAX_FILES_PER_COMMAND = 200;

export function runCommand(command: string, args: string[]): boolean {
  console.error(`$ ${command} ${args.length > 8 ? `${args.slice(0, 8).join(' ')} …` : args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: ['ignore', 2, 2] });
  return result.status === 0;
}

function inBatches(files: string[], runBatch: (batch: string[]) => boolean): boolean {
  let passed = true;
  for (let start = 0; start < files.length; start += MAX_FILES_PER_COMMAND) {
    passed = runBatch(files.slice(start, start + MAX_FILES_PER_COMMAND)) && passed;
  }
  return passed;
}

const outcomeOf = (passed: boolean): CheckOutcome => (passed ? 'pass' : 'fail');

interface TypeScriptProject {
  directory: string;
  owns: RegExp;
  command: string;
  args: string[];
}

const TSC = 'web/node_modules/.bin/tsc';
const TYPESCRIPT_PROJECTS: TypeScriptProject[] = [
  { directory: 'web', owns: /^web\//, command: TSC, args: ['-p', 'web'] },
  { directory: 'server', owns: /^server\//, command: TSC, args: ['-p', 'server'] },
  {
    directory: '.',
    owns: /^(tools|tests|shared)\/|^eslint\.config\.ts$/,
    command: TSC,
    args: ['-p', '.'],
  },
  {
    directory: 'glossary',
    owns: /^glossary\//,
    command: 'pnpm',
    args: ['-s', '-C', 'glossary', 'typecheck'],
  },
];

export const typecheck: LintCheck = {
  name: 'typecheck',
  run(selection) {
    const changed = filesMatching(selection, TYPESCRIPT_SOURCE);
    const projects = selection.stagedOnly
      ? TYPESCRIPT_PROJECTS.filter((project) => changed.some((file) => project.owns.test(file)))
      : TYPESCRIPT_PROJECTS;
    if (projects.length === 0) return 'skip';
    let passed = true;
    for (const project of projects) passed = runCommand(project.command, project.args) && passed;
    return outcomeOf(passed);
  },
};

export const eslint: LintCheck = {
  name: 'eslint',
  run(selection, { fix }) {
    const fixFlag = fix ? ['--fix'] : [];
    const baseArgs = ['--flag', 'unstable_native_nodejs_ts_config', '--max-warnings', '0', ...fixFlag];
    if (!selection.stagedOnly) return outcomeOf(runCommand('node_modules/.bin/eslint', [...baseArgs, '.']));
    const files = filesMatching(selection, ESLINT_SOURCE);
    if (files.length === 0) return 'skip';
    const stagedArgs = [...baseArgs, '--no-warn-ignored', '--pass-on-unpruned-suppressions'];
    return outcomeOf(
      inBatches(files, (batch) => runCommand('node_modules/.bin/eslint', [...stagedArgs, ...batch])),
    );
  },
};

export const ALL_CHECKS: LintCheck[] = [typecheck, eslint];
