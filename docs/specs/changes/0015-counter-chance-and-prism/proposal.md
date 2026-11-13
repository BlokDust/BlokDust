---
id: CHG-0015
title: Counter, Chance and Prism
status: proposed
date: 2026-11-13
specs: [SPEC-SIMULATION-POWER-AND-PARTICLES, SPEC-CONNECTIONS-PROXIMITY]
adrs: [SCOPE-0005, SIMULATION-0005, SIMULATION-0006]
---
# CHG-0015: Counter, Chance and Prism

## Why
Sequencing, randomness and redirection for particles and beams, without adding routing: three passive blocks that sit
in the path like Void.

## What changes
- **Counter** (`power.counter`): Steps 1–16, Hits 0–Steps, Rotate; passes the hit on active steps (SIMULATION-0005).
  Its panel draws the pattern as a ring of steps with the hits filled and the current step marked.
- **Chance** (`power.chance`): `chance` 0–100 %, seeded (SIMULATION-0005).
- **Prism** (`power.prism`): Angle, Rotate, Streams 1–4, Spread (SIMULATION-0006); exit lines while its panel is open.
- SPEC-SIMULATION-POWER-AND-PARTICLES: new R5c (gates), R5d (prism particles), R7a (beams through gates and prisms).
- SPEC-CONNECTIONS-PROXIMITY: these three never connect by proximity.
- Designs: `tools/block-designer/proposed.json` (owner, 2026-11-13); copy each into its manifest unchanged.

## Out of scope
- Picking individual steps by hand (Euclidean only for now).

## Acceptance
- `pnpm test:engine`: Euclidean patterns (E(3,8) = x..x..x.), pass/absorb, beam rising-edge decisions, prism fan angles,
  remaining range, 8-prism path limit, pool-full drop; each cites its R number.
- `pnpm bd render --check`: unchanged existing goldens; new `counter`, `chance`, `prism-split` goldens identical across
  release/dev, WASM and worklet.
- `pnpm test:ui-regressions`: counter panel shows the pattern; prism exit lines follow Angle.

## Risks and unknowns
- Beam fan-out cost with many prisms; the per-tick segment budget needs a number from `pnpm bd perf`.
