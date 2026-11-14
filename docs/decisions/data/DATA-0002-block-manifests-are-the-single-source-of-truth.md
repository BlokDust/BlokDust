---
id: DATA-0002
title: Block manifests are the single source of truth, with code generation
status: accepted
date: 2026-11-05
domain: data
tags: [blocks, codegen]
supersedes: []
superseded_by:
---
# DATA-0002: Block manifests are the single source of truth, with code generation

## Context
Each block's definition is needed in C++ (DSP params), TypeScript (UI, panels), the design library, docs and the MCP tool schema. Hand-syncing them would drift.

## Decision
Each block is one manifest in `blocks/<category>/<id>.block.json`: id, category, v1 type name, params (unit, range, curve, default, v1 mapping), geometry (polygons with palette roles, outline), behaviours (emits/receives power, absorbs particles), and docs. `pnpm bd codegen` generates C++ param structs, TS types, panel definitions, MCP schema and library pages.

## Consequences
Adding a block means writing one manifest plus its C++ DSP class. Generators must be deterministic and checked in CI (`--check`).
