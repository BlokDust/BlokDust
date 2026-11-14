---
id: UI-0002
title: Enforce visual parity with v1 through screenshot comparison
status: accepted
date: 2026-11-05
domain: ui
tags: [ui, testing, parity]
supersedes: []
superseded_by:
---
# UI-0002: Enforce visual parity with v1 through screenshot comparison

## Context
The owner wants v2 to look identical to v1. A local build of v1 (`dist/` at the pinned commit) gives byte-identical screenshots to femurdesign.com/blokdust. v1 also exposes a global `App`, so compositions can be injected headlessly.

## Decision
`pnpm bd v1 capture` produces reference PNGs from fixtures (compositions) and from every block type, deterministically (seeded `Math.random`, fixed viewport, paused scene). v2 renders the same fixtures and is compared with a perceptual diff. A change that drifts beyond the threshold fails CI unless the reference is intentionally updated.

## Consequences
- Fixtures are written in v1 composition format and converted with the v1 importer, which tests the importer too.
- Animated scenes are compared at controlled sim ticks, not wall-clock time.
