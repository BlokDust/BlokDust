// bd lint (CHG-0045): type checks, ESLint, formatting, comments and C++ checks in one command.
//   pnpm bd lint [--staged] [--only eslint,typecheck] [--fix]
//   pnpm bd lint baseline     record today's ESLint, comment and clang-tidy findings as baselines
//   pnpm bd lint prune        lower the baselines to what is found now (never raises them)
//   pnpm bd lint setup        install the pinned clang-format and clang-tidy into .cache (uv)
//   pnpm bd lint install      install the pre-commit hook (bd size + bd lint --staged)
import { installPreCommitHook } from '../lib/pre-commit-hook.ts';
import { runCommand, type CheckOutcome, type LintCheck } from './check.ts';
import { COMMENTS_BASELINE, collectCommentFindings } from '../comments/collect.ts';
import { pruneBaseline, recordBaseline } from './baseline.ts';
import { CLANG_TIDY_BASELINE, clangTidy, collectClangTidyFindings } from './clang-tidy.ts';
import { comments } from './comments.ts';
import { clangFormat, setUpLlvmTools } from './cxx.ts';
import { eslint, prettier, typecheck } from './typescript.ts';
import { partlyStaged, selectFiles } from './files.ts';

const args = process.argv.slice(2);
const firstArg = args[0] ?? '';
const subcommand = firstArg !== '' && !firstArg.startsWith('--') ? firstArg : 'check';
const valueAfter = (flag: string) => {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
};

const ALL_CHECKS: LintCheck[] = [typecheck, prettier, eslint, comments, clangFormat, clangTidy];
const ESLINT = 'node_modules/.bin/eslint';
const ESLINT_TS_CONFIG_FLAG = ['--flag', 'unstable_native_nodejs_ts_config'];

async function runChecks(): Promise<void> {
  const selection = selectFiles(args.includes('--staged'));
  const partial = partlyStaged(selection);
  if (partial.length > 0) {
    // Checking the working copy would judge code other than what is committed.
    console.error('bd lint --staged: these files have unstaged changes; stage them or stash them');
    console.error('first (git stash push --keep-index):');
    for (const file of partial) console.error(`  ${file}`);
    process.exit(1);
  }
  const onlyNames = valueAfter('--only')?.split(',');
  const checks = onlyNames
    ? ALL_CHECKS.filter((check) => onlyNames.includes(check.name))
    : ALL_CHECKS;
  const outcomes: Record<string, CheckOutcome> = {};
  for (const check of checks) {
    console.error(`\n== ${check.name}`);
    outcomes[check.name] = await check.run(selection, { fix: args.includes('--fix') });
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

/** Record (or lower) every baseline: ESLint's suppressions and our own counted ones. */
async function updateBaselines(mode: 'record' | 'prune'): Promise<boolean> {
  const eslintFlag = mode === 'record' ? '--suppress-all' : '--prune-suppressions';
  const eslintOk = runCommand(ESLINT, [...ESLINT_TS_CONFIG_FLAG, eslintFlag, '.']);
  const everything = selectFiles(false);
  const tidy = await collectClangTidyFindings(everything);
  const commentFindings = collectCommentFindings(everything.files);
  let tidyOk = true;
  if (mode === 'record') {
    // A skipped preset would drop its files' entries: record only from a complete run.
    if (tidy.skipped.length > 0) {
      console.error(`clang-tidy baseline not recorded: ${tidy.skipped.join(', ')} not checked`);
      tidyOk = false;
    } else recordBaseline(CLANG_TIDY_BASELINE, tidy.findings);
    recordBaseline(COMMENTS_BASELINE, commentFindings);
  } else {
    pruneBaseline(CLANG_TIDY_BASELINE, tidy.findings, everything.files.filter(tidy.checked));
    pruneBaseline(COMMENTS_BASELINE, commentFindings, everything.files);
  }
  return eslintOk && tidyOk;
}

switch (subcommand) {
  case 'check':
    await runChecks();
    break;
  case 'baseline':
  case 'prune':
    process.exit((await updateBaselines(subcommand === 'baseline' ? 'record' : 'prune')) ? 0 : 1);
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
