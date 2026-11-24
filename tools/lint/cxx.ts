// C++ checks: clang-format and clang-tidy at one pinned LLVM version, installed into .cache by `bd lint setup`.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { filesMatching, type FileSelection } from './files.ts';
import { runCommand, type LintCheck } from './check.ts';

export const LLVM_TOOLS_VERSION = '22.1.8';
const LLVM_TOOLS_DIR = '.cache/llvm-tools';
export const CLANG_FORMAT = `${LLVM_TOOLS_DIR}/bin/clang-format`;
export const CLANG_TIDY = `${LLVM_TOOLS_DIR}/bin/clang-tidy`;

const CXX_SOURCE = /^(engine|plugin)\/.*\.(cpp|hpp|h|mm)$/;
const GENERATED = /(^|\/)generated\//;

export function cxxFiles(selection: FileSelection): string[] {
  return filesMatching(selection, CXX_SOURCE).filter((file) => !GENERATED.test(file));
}

function installedVersion(binary: string): string | undefined {
  if (!existsSync(binary)) return undefined;
  const output = spawnSync(binary, ['--version'], { encoding: 'utf8' }).stdout;
  return /version (\d+\.\d+\.\d+)/.exec(output)?.[1];
}

export function setUpLlvmTools(): boolean {
  const upToDate = [CLANG_FORMAT, CLANG_TIDY].every(
    (binary) => installedVersion(binary) === LLVM_TOOLS_VERSION,
  );
  if (upToDate) return true;
  const packages = [`clang-format==${LLVM_TOOLS_VERSION}`, `clang-tidy==${LLVM_TOOLS_VERSION}`];
  return (
    runCommand('uv', ['venv', '--quiet', '--allow-existing', LLVM_TOOLS_DIR]) &&
    runCommand('uv', [
      'pip',
      'install',
      '--quiet',
      '--python',
      `${LLVM_TOOLS_DIR}/bin/python`,
      ...packages,
    ])
  );
}

function requireLlvmTools(): boolean {
  if (installedVersion(CLANG_FORMAT) === LLVM_TOOLS_VERSION) return true;
  console.error(
    `clang-format ${LLVM_TOOLS_VERSION} is missing: run \`pnpm bd lint setup\` (needs uv).`,
  );
  return false;
}

export const clangFormat: LintCheck = {
  name: 'clang-format',
  run(selection, { fix }) {
    const files = cxxFiles(selection);
    if (files.length === 0) return 'skip';
    if (!requireLlvmTools()) return 'fail';
    const mode = fix ? ['-i'] : ['--dry-run', '--Werror'];
    return runCommand(CLANG_FORMAT, [...mode, ...files]) ? 'pass' : 'fail';
  },
};
