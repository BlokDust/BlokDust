// TypeScript checks: tsc per project, Prettier and ESLint.
import { filesMatching } from './files.ts';
import { inBatches, outcomeOf, runCommand, type LintCheck } from './check.ts';

const TYPESCRIPT_SOURCE = /\.(ts|tsx|mts|cts|astro)$/;
const ESLINT_SOURCE = /\.(ts|tsx|mts|cts|js|mjs|cjs|astro)$/;

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
    owns: /^(tools|shared)\/|^eslint\.config\.ts$/,
    command: TSC,
    args: ['-p', '.'],
  },
  // Node strips the tests' types; bundler resolution lets them import the web app's types.
  { directory: 'tests', owns: /^(tests|web)\//, command: TSC, args: ['-p', 'tests'] },
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
    const baseArgs = [
      '--flag',
      'unstable_native_nodejs_ts_config',
      '--max-warnings',
      '0',
      ...fixFlag,
    ];
    if (!selection.stagedOnly)
      return outcomeOf(runCommand('node_modules/.bin/eslint', [...baseArgs, '.']));
    const files = filesMatching(selection, ESLINT_SOURCE);
    if (files.length === 0) return 'skip';
    const stagedArgs = [...baseArgs, '--no-warn-ignored', '--pass-on-unpruned-suppressions'];
    return outcomeOf(
      inBatches(files, (batch) =>
        runCommand('node_modules/.bin/eslint', [...stagedArgs, ...batch]),
      ),
    );
  },
};

const PRETTIER_SOURCE = /\.(ts|tsx|mts|cts|js|mjs|cjs|astro|css|html)$/;

export const prettier: LintCheck = {
  name: 'prettier',
  run(selection, { fix }) {
    const files = filesMatching(selection, PRETTIER_SOURCE);
    if (files.length === 0) return 'skip';
    const mode = fix ? '--write' : '--check';
    return outcomeOf(
      inBatches(files, (batch) =>
        runCommand('node_modules/.bin/prettier', [
          mode,
          '--ignore-unknown',
          '--log-level',
          'warn',
          ...batch,
        ]),
      ),
    );
  },
};
