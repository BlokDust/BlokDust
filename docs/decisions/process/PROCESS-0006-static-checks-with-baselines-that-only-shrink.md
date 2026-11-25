---
id: PROCESS-0006
title: Static checks with baselines that only shrink
status: accepted
date: 2026-11-25
domain: process
tags: []
supersedes: []
superseded_by:
---
# PROCESS-0006: Static checks with baselines that only shrink

## Context
Only `web/` and `server/` were type-checked and nothing was linted, so agents wrote dense code with long comments
in place of names, and large files mixed concerns (CHG-0045). Turning strict checks on found thousands of findings;
fixing all of them before the checks could gate anything would hold every other change back.

## Decision
`bd lint` runs every static check: tsc for all TypeScript, Prettier, ESLint (typescript-eslint strict type-checked,
no `any`), `bd comments` (comment blocks of at most two lines of 100 characters), clang-format and clang-tidy at a
pinned LLVM. `bd size` keeps files to about 5,000 tokens. Each has a baseline of today's findings per file and rule
(`eslint-suppressions.json`, `tools/comments/baseline.json`, `tools/lint/clang-tidy-baseline.json`,
`tools/size/baseline.json`) that may only shrink: a new finding fails, and `bd lint prune` / `bd size baseline`
lower the counts once code is fixed. The pre-commit hook checks staged files; `bd ci` checks everything. C++
warnings fail every preset's build. A deliberate exception is a `NOLINT(check): reason` on its line, never a rule
turned off for the whole codebase.

## Consequences
New code meets the rules from the first commit, and old code is cleaned area by area without blocking other work.
Moving code to a new file carries its findings with it: re-record the baselines after a split and check that no
rule's total grew. What is left is tracked in CHG-0045's tasks for follow-up changes: typing `tools/` JSON, the
block designer, short C++ names and splitting the C++ files over the size limit.

## Alternatives considered
- **Fix everything before enabling the checks**: thousands of edits in one change, and nothing guards new code
  meanwhile.
- **Warnings only**: they are ignored; the count grows.
- **Disable noisy rules**: loses the rule for new code too; a baseline keeps it for new code and lists the debt.
