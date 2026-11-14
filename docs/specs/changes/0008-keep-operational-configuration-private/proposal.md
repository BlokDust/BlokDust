---
id: CHG-0008
title: Keep operational configuration private
status: proposed
date: 2026-11-11
specs: [SPEC-PROCESS-PRIVATE-OPERATIONAL-CONFIGURATION]
adrs: [PROCESS-0005]
---
# CHG-0008: Keep operational configuration private

## Why
Prepare the repository for publication while preserving local agent access to deployment, signing and test workflows.
Personal infrastructure settings and machine notes must not travel with source or Git history.

## What changes
External configuration and local notes, safe examples, shared parsing/validation, private generated Wrangler config,
configurable test hosts and VM users, generic signing instructions and privacy gates (SPEC-PROCESS-PRIVATE-OPERATIONAL-CONFIGURATION R1–R5).

## Out of scope
Changing product behavior, removing required attribution, moving private keys out of credential stores, or changing repository visibility.

## Acceptance
`pnpm check`, `pnpm bd privacy selftest`, tracked/history privacy scans, Worker typecheck, local sharing tests,
frontend typecheck/build and remote-config deployment dry-run. Verify plugin test-host reachability and configured identities.

## Risks and unknowns
History rewrite changes commit IDs. Read-only hosting refs and caches may retain old objects even after branch force pushes.
Preserve unrelated local work and keep recovery material outside the repository.
