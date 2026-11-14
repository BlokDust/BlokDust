---
id: PROCESS-0002
title: Tools-first software factory
status: accepted
date: 2026-11-05
domain: process
tags: [agents, tooling, factory]
supersedes: []
superseded_by:
---
# PROCESS-0002: Tools-first software factory

## Context
Inspired by Swamp Club's behaviour-centric approach: agents should encode repeated work into deterministic, typed, reusable tools instead of re-deriving it each session, which wastes tokens and gives inconsistent results.

## Decision
- Every repeated task becomes a tool in `tools/<name>/` (`index.ts` plus `tool.json` manifest), run as `pnpm bd <name>`, with JSON output on stdout and diagnostics on stderr.
- `tools/README.md` is a generated registry. Agents **must check it before writing ad-hoc scripts**.
- The LLM handles intent and judgement, and tools do the mechanics: indexing, codegen, capture, diffing, rendering, validating.

## Consequences
Over time the toolset becomes the project's automation layer, and an agent session gets cheaper as it grows.
