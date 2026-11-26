---
id: CHG-0045
title: Linting, formatting and code structure
status: in-progress
date: 2026-11-23
specs: [SPEC-PATCH-FORMAT-V2]
adrs: [PROCESS-0002, PROCESS-0004, PROCESS-0006, SIMULATION-0001]
---
# CHG-0045: Linting, formatting and code structure

## Why
Only `web/` and `server/` were type-checked, nothing linted or formatted the code, and C++ warnings never failed a
build. Code was written in a dense one-line style with long comments in place of descriptive names, and the largest
files mixed many concerns. The owner wants every file linted, formatted and split by concern in one change.

## What changes
- Type-check every TypeScript file: `tools/`, `tests/`, `shared/` and the glossary join `web/` and `server/`.
- ESLint with typescript-eslint's strict type-checked rules on all TypeScript: no `any`, no floating promises,
  exhaustive switches, descriptive names.
- Prettier formats TypeScript, Astro and CSS; clang-format formats C++.
- `bd comments`: comment blocks of at most two lines of at most 100 characters; spec, ADR and change IDs are allowed.
- C++: clang-tidy (bugprone, performance, concurrency, naming, banned non-deterministic functions in the engine),
  warnings as errors in dev and CI builds, the same warnings for tests, tools and the plugin's own code.
- Real-time safety: the audio-thread entry points are `[[clang::nonblocking]]`, checked at compile time
  (`-Wfunction-effects`) and at run time (RealtimeSanitizer preset).
- `pnpm lint` (`bd lint`) runs all of it; it is a `bd ci` step and runs on staged files in the pre-commit hook.
- Files split by concern into directories a reader can navigate, each under the `bd size` limit.

## Out of scope
Behaviour changes. Every golden hash, visual diff and black-box test must pass unchanged.

## Acceptance
- `pnpm lint` and `pnpm bd size check` pass; their baselines may only shrink (PROCESS-0006). The owner moved emptying
  them for `tools/` typing, the block designer, short C++ names and the C++ splits to follow-up changes (tasks 4a–9a).
- `pnpm bd ci` passes; `pnpm bd render --check --configs release,dev` hashes are unchanged.
- Staging deploy works for an owner playtest.

## Risks and unknowns
- typescript-eslint needs the TypeScript 6 JS API; `tsc` 7 stays the type checker.
- Splitting large files risks behaviour changes; the e2e, visual and golden suites guard them.
