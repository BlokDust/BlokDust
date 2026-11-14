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
  Its panel's first row draws the pattern: a diamond per step, filled where a hit passes, the next step underlined.
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
- `pnpm test:new-blocks --only counter-panel,prism-splits-beam`: the menu has them, the Counter's panel shows the
  pattern and where it is, a Prism splits a beam and draws its exit lines.

## Risks and unknowns
- Beam fan-out cost with many prisms: bounded at 64 beams per laser and 8 Prisms per path (`config.hpp`); not yet
  measured with `pnpm bd perf`.
- A Prism has Rotate but no tempo-synced Turn (the Laser has both); add it if wanted.

## Owner review 1 (2026-11-14)
- Counter: a click on a step toggles it (`pattern`, a bitmask; −1 = Euclidean). Moving Steps, Hits or Rotate gives the Euclidean pattern back.
- Laser and Prism Rotate stick at 0: a drag into the middle stops there; staying near it for half a second lets small values through.
