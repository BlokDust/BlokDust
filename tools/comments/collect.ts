// Comment findings for a set of files, compared with the baseline (shared by bd comments and bd lint).
import { compareWithBaseline, readBaseline, type Finding } from '../lint/baseline.ts';
import type { FileSelection } from '../lint/files.ts';
import { checksComments, commentFindings } from './rules.ts';

export const COMMENTS_BASELINE = 'tools/comments/baseline.json';

export function collectCommentFindings(files: string[]): Finding[] {
  return files.filter(checksComments).flatMap(commentFindings);
}

export function compareCommentFindings(selection: FileSelection) {
  const findings = collectCommentFindings(selection.files);
  const baseline = readBaseline(COMMENTS_BASELINE);
  const checkedFiles = selection.files.filter(checksComments);
  return { findings, ...compareWithBaseline(findings, baseline, checkedFiles) };
}
