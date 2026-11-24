// bd lint (CHG-0045): type checks, ESLint, formatting, comments and C++ checks in one command.
//   pnpm bd lint [--staged] [--only eslint,typecheck] [--fix]
//   pnpm bd lint baseline     record today's ESLint findings in eslint-suppressions.json
//   pnpm bd lint prune        drop suppressions that no longer occur
//   pnpm bd lint setup        install the pinned clang-format and clang-tidy into .cache (uv)
//   pnpm bd lint install      install the pre-commit hook (bd size + bd lint --staged)
import { installPreCommitHook } from '../lib/pre-commit-hook.ts';
import { runCommand, type CheckOutcome, type LintCheck } from './check.ts';
import { clangFormat, setUpLlvmTools } from './cxx.ts';
import { eslint, prettier, typecheck } from './typescript.ts';
import { selectFiles } from './files.ts';

const args = process.argv.slice(2);
const subcommand = args[0]?.startsWith('--') === false ? args[0] : 'check';
const valueAfter = (flag: string) => {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
};

const ALL_CHECKS: LintCheck[] = [typecheck, prettier, eslint, clangFormat];
const ESLINT = 'node_modules/.bin/eslint';
const ESLINT_TS_CONFIG_FLAG = ['--flag', 'unstable_native_nodejs_ts_config'];

function runChecks(): void {
  const selection = selectFiles(args.includes('--staged'));
  const onlyNames = valueAfter('--only')?.split(',');
  const checks = onlyNames
    ? ALL_CHECKS.filter((check) => onlyNames.includes(check.name))
    : ALL_CHECKS;
  const outcomes: Record<string, CheckOutcome> = {};
  for (const check of checks) {
    console.error(`\n== ${check.name}`);
    outcomes[check.name] = check.run(selection, { fix: args.includes('--fix') });
  }
  const failed = Object.keys(outcomes).filter((name) => outcomes[name] === 'fail');
  console.log(JSON.stringify({ staged: selection.stagedOnly, outcomes, failed }));
  if (failed.length > 0) {
    console.error(
      `\nbd lint failed: ${failed.join(', ')}. Fix the findings above (\`pnpm bd lint --fix\` fixes some).`,
    );
    process.exit(1);
  }
}

switch (subcommand) {
  case 'check':
    runChecks();
    break;
  case 'baseline':
    process.exit(runCommand(ESLINT, [...ESLINT_TS_CONFIG_FLAG, '--suppress-all', '.']) ? 0 : 1);
    break;
  case 'prune':
    process.exit(
      runCommand(ESLINT, [...ESLINT_TS_CONFIG_FLAG, '--prune-suppressions', '.']) ? 0 : 1,
    );
    break;
  case 'setup':
    process.exit(setUpLlvmTools() ? 0 : 1);
    break;
  case 'install':
    console.log(JSON.stringify({ installed: installPreCommitHook() }));
    break;
  default:
    console.error(
      'usage: pnpm bd lint [--staged] [--only a,b] [--fix] | baseline | prune | setup | install',
    );
    process.exit(2);
}
