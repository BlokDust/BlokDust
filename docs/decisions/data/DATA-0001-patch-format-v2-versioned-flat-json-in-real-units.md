---
id: DATA-0001
title: Patch format v2: versioned flat JSON in real units; connections derived
status: accepted
date: 2026-11-05
domain: data
tags: [patch, schema]
supersedes: []
superseded_by:
---
# DATA-0001: Patch format v2: versioned flat JSON in real units; connections derived

## Context
v1 saves (`Serializer.ts`) nest blocks recursively with id back-references, use `constructor.name` as the type (fragile under minification), and store parameters as UI slider values (e.g. `rate = 510 - slider`).

## Decision
Patches are flat JSON validated by a JSON Schema: `{ format: "blokdust.patch", version: 2, seed, tempo, theme, view, blocks: [{ id, type, x, y, z, params }] , refs, meta: { title, parent } }`. Types are stable namespaced ids (`fx.reverb`). Params use real units. Connections are **never stored**. They are derived from positions (SIMULATION-0002). Typical size is a few KB, with a hard cap of 64 KB.

## Consequences
- Small patches fit in a URL fragment (compressed), so sharing works without the backend.
- Schema migrations are explicit functions `vN -> vN+1`.
