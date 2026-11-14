---
id: PROCESS-0005
title: Keep personal configuration outside checkouts
status: accepted
date: 2026-11-11
domain: process
tags: []
supersedes: []
superseded_by:
---
# PROCESS-0005: Keep personal configuration outside checkouts

## Context
The repository is intended for public release. Agents need private deployment settings and machine instructions,
but hardcoded defaults and generated operational notes disclose personal infrastructure.

## Decision
Keep host settings and local notes outside all checkouts in `~/.config/blokdust/`. Commit safe example variables
and generic workflows. Use a shared dotenv loader, preserve credential stores, generate private remote deployment
configuration, and audit both source and reachable history (SPEC-PROCESS-PRIVATE-OPERATIONAL-CONFIGURATION).

## Consequences
The same commands work for local agents and CI through configuration. Public builds and mock tests remain independent
of private settings. Local setup needs one external file. Old history and hosting caches need separate remediation.

## Alternatives considered
- Ignored configuration inside each checkout: duplicates personal settings across worktrees and increases staging risk.
- Put all credentials into dotenv: unnecessary plaintext copies of Keychain and SSH secrets.
