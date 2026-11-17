---
id: CHG-0030
title: Envelope graph easier to set
status: proposed
date: 2026-11-17
specs: [SPEC-VISUAL-V1-PARITY]
adrs: [UI-0014]
---
# CHG-0030: Envelope graph easier to set

## Why
Short attacks are hard to set on the Envelope's graph (owner, 2026-11-17): v1 draws 10 ms – 5 s on a straight line,
so everything under 100 ms is squeezed into a few pixels, a press beside a handle jumps its value, and overlapping
handles are grabbed together.

## What changes
- The attack, decay and release handles sit on a log time axis (UI-0014); the graph keeps v1's drawing.
- While a handle is held its value shows in the panel just above the graph, right-aligned: `ATTACK 12 ms`, `DECAY 300 ms   SUSTAIN 70%`,
  `RELEASE 1.20 s`.
- A handle follows the pointer from where it was grabbed (no jump on press); Shift moves it a tenth as fast.
- A press where handles overlap takes the nearest one only.

## Out of scope
- Engine, patch format, and the parameter ranges (still 10 ms – 5 s, sustain 0–1).

## Acceptance
- `pnpm test:ui-regressions --only envelope-short-attack`: no jump on press; dragged to a tenth of its track the attack
  is ~19 ms (v1: 0.5 s) and the engine gets it; with Shift, 40 px of pointer is 4 px of handle; a press on an
  overlapping decay handle takes decay only. Fails on the build without `installAdsr` (all four checks).
- `pnpm test:ui-regressions`: everything else unchanged.

## Risks and unknowns
- None known. The owner compared log, squared and straight axes on staging (2026-11-17) and picked log.
