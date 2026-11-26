// bd lint's comment check: the bd comments rule against its baseline.
import { compareCommentFindings } from '../comments/collect.ts';
import { checksComments } from '../comments/rules.ts';
import { reportFindings } from './baseline.ts';
import type { LintCheck } from './check.ts';

export const comments: LintCheck = {
  name: 'comments',
  run(selection) {
    if (!selection.files.some(checksComments)) return 'skip';
    const { findings, overAllowance, stale } = compareCommentFindings(selection);
    reportFindings(overAllowance);
    const staleShown = selection.stagedOnly ? [] : stale;
    for (const entry of staleShown)
      console.error(`fewer than the baseline allows (pnpm bd lint prune): ${entry}`);
    console.error(
      `comments: ${findings.length} findings, ${overAllowance.length} over the baseline`,
    );
    return overAllowance.length === 0 && staleShown.length === 0 ? 'pass' : 'fail';
  },
};
