---
id: PROCESS-0001
title: AGENTS.md is the canonical agent instruction file
status: accepted
date: 2026-11-05
domain: process
tags: [agents, docs]
supersedes: []
superseded_by:
---
# PROCESS-0001: AGENTS.md is the canonical agent instruction file

## Decision
The repo uses `AGENTS.md` (root, plus nested ones per package when needed). `CLAUDE.md` contains only `@AGENTS.md` so Claude Code loads the same instructions. Agents from any provider share one source.
