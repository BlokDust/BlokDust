---
id: UI-0005
title: Draw the static stage in one Canvas2D layer composited by Pixi
status: accepted
date: 2026-11-05
domain: ui
tags: [rendering, parity, pixi, canvas2d]
supersedes: []
superseded_by:
---
# UI-0005: Draw the static stage in one Canvas2D layer composited by Pixi

## Context
The owner wants v2 to be as pixel-perfect as possible against v1. v1 draws everything (background, connection lines, blocks, overlays) with Canvas2D into one canvas at `devicePixelRatio`, so its edges carry Canvas2D's analytic anti-aliasing blended directly onto the background. Turning anti-aliasing off would move further from v1; SVG rasterises differently again.

## Decision
The stage's static content — background, connection lines, blocks and block overlays — is drawn with the same Canvas2D path calls v1 makes, in v1's order, into **one opaque canvas** that Pixi composites as a single texture. It is redrawn only when something changes (block added/moved/removed, topology, power, theme, view). Fast-changing content (particles, later laser beams) stays native Pixi on top.

## Evidence
`pnpm bd visual bakeoff` (CHG-0001 task 0.10) renders every v1 reference scene through the real v2 Stage and diffs against the v1 screenshots (66 scenes: 32 blocks + 1 composed scene with lines, at 1× and 2×), plus a 100-block / 2000-particle frame benchmark. Results in `docs/engineering/renderer-bakeoff.md`:

| Candidate | Bit-identical | Passing 0.5% | Max channel Δ | Median frame |
|---|---|---|---|---|
| **One Canvas2D layer (chosen)** | **66/66** | 66/66 | 0 | 3.7 ms |
| Per-block Canvas2D-baked sprites | 0/66 | 66/66 | 3 (edge blending rounding) | 5.4 ms |
| Pixi Graphics, MSAA | 0/66 | 24/66 | 115 | 2.8 ms |
| Pixi Graphics, 2× supersampled | 0/66 | 41/66 | 91 | 50 ms |

## Consequences
- v2 is bit-identical to v1 for every block and for connection lines (`pnpm bd visual diff`). The 0.5% threshold remains as a safety net, and today's margin is 0.
- Any change redraws and re-uploads a full-screen texture. That was cheaper than per-block re-baking in the benchmark, but iPad/AUv3 may need dirty-rectangle uploads. Measure on device in Phase 5.
- Benchmarks ran in headless Chromium with software GL; absolute times are pessimistic, the relative ranking is what counts.
- The per-block baked renderer stays available (`renderer: 'baked'`) for the library page and as a fallback.
