// bd comments (CHG-0045): comment blocks of at most two lines, each at most 100 characters.
//   pnpm bd comments check [--staged]   report findings past tools/comments/baseline.json
//   pnpm bd comments list [files…]      every finding, baseline or not (for fixing a file)
//   pnpm bd comments baseline | prune   record, or lower, the baseline
import { pruneBaseline, recordBaseline, reportFindings } from '../lint/baseline.ts';
import { selectFiles } from '../lint/files.ts';
import { COMMENTS_BASELINE, collectCommentFindings, compareCommentFindings } from './collect.ts';

const [subcommand = 'check', ...rest] = process.argv.slice(2);

switch (subcommand) {
  case 'check': {
    const selection = selectFiles(rest.includes('--staged'));
    const { findings, overAllowance, stale } = compareCommentFindings(selection);
    reportFindings(overAllowance);
    for (const entry of stale) console.error(`fewer findings than the baseline allows: ${entry}`);
    console.log(
      JSON.stringify({
        findings: findings.length,
        overBaseline: overAllowance.length,
        stale: stale.length,
      }),
    );
    if (overAllowance.length > 0 || stale.length > 0) process.exit(1);
    break;
  }
  case 'list': {
    const files = rest.length > 0 ? rest : selectFiles(false).files;
    const findings = collectCommentFindings(files);
    reportFindings(findings);
    console.log(JSON.stringify({ findings: findings.length }));
    break;
  }
  case 'baseline':
  case 'prune': {
    const everything = selectFiles(false);
    const findings = collectCommentFindings(everything.files);
    if (subcommand === 'baseline') recordBaseline(COMMENTS_BASELINE, findings);
    else pruneBaseline(COMMENTS_BASELINE, findings, everything.files);
    console.log(JSON.stringify({ baseline: COMMENTS_BASELINE, findings: findings.length }));
    break;
  }
  default:
    console.error('usage: pnpm bd comments check [--staged] | list [files…] | baseline | prune');
    process.exit(2);
}
