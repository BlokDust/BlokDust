// clang-tidy over our C++ (CHG-0045), with a baseline that may only shrink (clang-tidy-baseline.json).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { basename, relative, resolve } from 'node:path';
import { compareWithBaseline, readBaseline, reportFindings, type Finding } from './baseline.ts';
import type { CheckOutcome, LintCheck } from './check.ts';
import { CLANG_TIDY, cxxFiles, LLVM_TOOLS_VERSION } from './cxx.ts';
import type { FileSelection } from './files.ts';

export const CLANG_TIDY_BASELINE = 'tools/lint/clang-tidy-baseline.json';

interface CompileDatabase {
  owns: RegExp;
  buildDir: string;
  preset: string;
  /** What configuring this preset needs first (the plugin embeds the web build). */
  needs?: string;
}

const COMPILE_DATABASES: CompileDatabase[] = [
  { owns: /^engine\//, buildDir: 'build/dev', preset: 'dev' },
  { owns: /^plugin\//, buildDir: 'build/plugin', preset: 'plugin', needs: 'web/dist/index.html' },
];
const TRANSLATION_UNIT = /\.(cpp|mm)$/;
const DIAGNOSTIC = /^(\/[^:]+):(\d+):\d+: (?:error|warning): (.*) \[([^\]]+)\]$/;

function compiledFiles(database: CompileDatabase): string[] {
  const path = `${database.buildDir}/compile_commands.json`;
  if (!existsSync(path)) {
    if (database.needs && !existsSync(database.needs)) return [];
    console.error(`configuring ${database.preset} for its compile database…`);
    spawnSync('cmake', ['--preset', database.preset], { stdio: ['ignore', 2, 2] });
  }
  if (!existsSync(path)) return [];
  const entries = JSON.parse(readFileSync(path, 'utf8')) as { file: string }[];
  return entries.map((entry) => relative(process.cwd(), resolve(entry.file)));
}

function macSdkArgs(): string[] {
  if (process.platform !== 'darwin') return [];
  const sdk = spawnSync('xcrun', ['--show-sdk-path'], { encoding: 'utf8' }).stdout.trim();
  return sdk ? [`--extra-arg=-isysroot${sdk}`] : [];
}

/** Units to analyse: every one we own, or (staged) the staged ones and those including a staged header. */
function unitsToAnalyse(selection: FileSelection, compiled: string[]): string[] {
  const ours = compiled.filter(
    (file) => /^(engine|plugin)\//.test(file) && TRANSLATION_UNIT.test(file),
  );
  if (!selection.stagedOnly) return [...new Set(ours)];
  const staged = cxxFiles(selection);
  const stagedHeaders = staged
    .filter((file) => !TRANSLATION_UNIT.test(file))
    .map((header) => basename(header));
  return [
    ...new Set(
      ours.filter(
        (unit) =>
          staged.includes(unit) ||
          stagedHeaders.some((header) => readFileSync(unit, 'utf8').includes(`${header}"`)),
      ),
    ),
  ];
}

function runTidy(unit: string, buildDir: string, sdkArgs: string[]): Promise<string> {
  return new Promise((done) => {
    const child = spawn(CLANG_TIDY, ['-p', buildDir, '--quiet', ...sdkArgs, unit]);
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.on('close', () => {
      done(output);
    });
  });
}

function parseFindings(output: string): Finding[] {
  const findings: Finding[] = [];
  for (const line of output.split('\n')) {
    const match = DIAGNOSTIC.exec(line);
    if (!match) continue;
    const [, absolutePath = '', lineNumber = '0', message = '', rules = ''] = match;
    const file = relative(process.cwd(), absolutePath);
    if (!/^(engine|plugin)\//.test(file) || /\/generated\/|_deps\//.test(file)) continue;
    const rule = rules.split(',')[0] ?? rules;
    findings.push({ file, line: Number(lineNumber), rule, message });
  }
  return findings;
}

export async function collectClangTidyFindings(selection: FileSelection): Promise<Finding[]> {
  const sdkArgs = macSdkArgs();
  const jobs: { unit: string; buildDir: string }[] = [];
  for (const database of COMPILE_DATABASES) {
    const compiled = compiledFiles(database).filter((file) => database.owns.test(file));
    if (compiled.length === 0) {
      console.error(
        `clang-tidy: no ${database.buildDir} compile database; skipping ${database.preset}`,
      );
      continue;
    }
    for (const unit of unitsToAnalyse(selection, compiled))
      jobs.push({ unit, buildDir: database.buildDir });
  }
  const outputs: string[] = [];
  const pending = [...jobs];
  const worker = async () => {
    for (let job = pending.shift(); job !== undefined; job = pending.shift()) {
      outputs.push(await runTidy(job.unit, job.buildDir, sdkArgs));
    }
  };
  await Promise.all(Array.from({ length: availableParallelism() }, worker));
  const unique = new Map<string, Finding>();
  for (const finding of outputs.flatMap(parseFindings)) {
    unique.set(`${finding.file}:${finding.line}:${finding.rule}:${finding.message}`, finding);
  }
  return [...unique.values()].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

export const clangTidy: LintCheck = {
  name: 'clang-tidy',
  async run(selection): Promise<CheckOutcome> {
    if (cxxFiles(selection).length === 0) return 'skip';
    if (!existsSync(CLANG_TIDY)) {
      console.error(`clang-tidy ${LLVM_TOOLS_VERSION} is missing: run \`pnpm bd lint setup\`.`);
      return 'fail';
    }
    const findings = await collectClangTidyFindings(selection);
    const compileErrors = findings.filter((finding) => finding.rule === 'clang-diagnostic-error');
    const baseline = readBaseline(CLANG_TIDY_BASELINE);
    const checkedFiles = selection.stagedOnly ? [] : Object.keys(baseline);
    const { overAllowance, stale } = compareWithBaseline(findings, baseline, checkedFiles);
    reportFindings([...compileErrors, ...overAllowance]);
    if (stale.length > 0) {
      console.error(
        `clang-tidy: fewer findings than the baseline allows; run \`pnpm bd lint prune\`:`,
      );
      for (const entry of stale) console.error(`  ${entry}`);
    }
    const passed = compileErrors.length === 0 && overAllowance.length === 0 && stale.length === 0;
    console.error(
      `clang-tidy: ${findings.length} findings, ${overAllowance.length} over the baseline`,
    );
    return passed ? 'pass' : 'fail';
  },
};
