// A findings baseline that may only shrink: counts per file and rule (clang-tidy, bd comments).
// ESLint keeps its own (eslint-suppressions.json); these work the same way.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export interface Finding {
  file: string;
  line: number;
  rule: string;
  message: string;
}

type RuleCounts = Partial<Record<string, number>>;
export type Baseline = Partial<Record<string, RuleCounts>>;

export function readBaseline(path: string): Baseline {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Baseline) : {};
}

function countFindings(findings: Finding[]): Baseline {
  const counts: Baseline = {};
  for (const finding of findings) {
    const fileCounts = (counts[finding.file] ??= {});
    fileCounts[finding.rule] = (fileCounts[finding.rule] ?? 0) + 1;
  }
  return counts;
}

function sortedBaseline(baseline: Baseline): Baseline {
  const sorted: Baseline = {};
  for (const file of Object.keys(baseline).sort()) {
    const rules = baseline[file] ?? {};
    const ruleNames = Object.keys(rules).sort();
    const nonZero = ruleNames.filter((rule) => (rules[rule] ?? 0) > 0);
    if (nonZero.length > 0)
      sorted[file] = Object.fromEntries(nonZero.map((rule) => [rule, rules[rule]]));
  }
  return sorted;
}

export function writeBaseline(path: string, baseline: Baseline): void {
  writeFileSync(path, JSON.stringify(sortedBaseline(baseline), null, 2) + '\n');
}

/** Today's findings become the allowance (first run, or after a deliberate reset). */
export function recordBaseline(path: string, findings: Finding[]): void {
  writeBaseline(path, countFindings(findings));
}

/** Lower each allowance to what is found now; never raise one. Zero allowances are dropped on write. */
export function pruneBaseline(path: string, findings: Finding[], checkedFiles: string[]): void {
  const current = countFindings(findings);
  const baseline = readBaseline(path);
  for (const file of checkedFiles) {
    const allowed = baseline[file];
    if (!allowed) continue;
    for (const rule of Object.keys(allowed)) {
      allowed[rule] = Math.min(allowed[rule] ?? 0, current[file]?.[rule] ?? 0);
    }
  }
  writeBaseline(path, baseline);
}

export interface BaselineComparison {
  /** Findings in a file and rule past its allowance (all of that file's findings for the rule). */
  overAllowance: Finding[];
  /** "file rule" pairs whose allowance is higher than what is found: prune to lock that in. */
  stale: string[];
}

export function compareWithBaseline(
  findings: Finding[],
  baseline: Baseline,
  checkedFiles: string[],
): BaselineComparison {
  const current = countFindings(findings);
  const overAllowance = findings.filter(
    (finding) =>
      (current[finding.file]?.[finding.rule] ?? 0) > (baseline[finding.file]?.[finding.rule] ?? 0),
  );
  const stale: string[] = [];
  for (const file of checkedFiles) {
    for (const [rule, allowed] of Object.entries(baseline[file] ?? {})) {
      if ((current[file]?.[rule] ?? 0) < (allowed ?? 0)) stale.push(`${file} ${rule}`);
    }
  }
  return { overAllowance, stale };
}

export function reportFindings(findings: Finding[]): void {
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line}: ${finding.message} [${finding.rule}]`);
  }
}
