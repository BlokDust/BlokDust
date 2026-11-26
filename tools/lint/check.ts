// What every `bd lint` check shares: its shape, and running a command with output on stderr.
import { spawnSync } from 'node:child_process';
import type { FileSelection } from './files.ts';

export interface CheckOptions {
  fix: boolean;
}

export interface LintCheck {
  name: string;
  run: (selection: FileSelection, options: CheckOptions) => CheckOutcome | Promise<CheckOutcome>;
}

export type CheckOutcome = 'pass' | 'fail' | 'skip';

// Keeps argument lists well under the OS limit.
const MAX_FILES_PER_COMMAND = 200;

export function runCommand(command: string, args: string[]): boolean {
  console.error(
    `$ ${command} ${args.length > 8 ? `${args.slice(0, 8).join(' ')} …` : args.join(' ')}`,
  );
  const result = spawnSync(command, args, { stdio: ['ignore', 2, 2] });
  return result.status === 0;
}

export function inBatches(files: string[], runBatch: (batch: string[]) => boolean): boolean {
  let passed = true;
  for (let start = 0; start < files.length; start += MAX_FILES_PER_COMMAND) {
    passed = runBatch(files.slice(start, start + MAX_FILES_PER_COMMAND)) && passed;
  }
  return passed;
}

export const outcomeOf = (passed: boolean): CheckOutcome => (passed ? 'pass' : 'fail');
