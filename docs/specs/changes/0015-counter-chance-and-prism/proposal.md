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
Sequencing, randomness and redirection for particles and beams, without adding routing.

## What changes
- **Counter** (`power.counter`, catchment 6): a Pulse with a pattern (SIMULATION-0005). Steps 1–16, Hits 0–Steps,
  Rotate; each hit moves it one step and an active step pulses its connected blocks. Its panel's first row draws the
  pattern: a diamond per step, filled where it pulses, the next step underlined. A click on a step toggles it
  (`pattern`, a bitmask; −1 = Euclidean); moving Steps, Hits or Rotate gives the Euclidean pattern back. A Reset button
  sends it back to step 1.
- **Chance** (`power.chance`, catchment 6): a Pulse that fires at random (SIMULATION-0005). Each hit rolls once, and
  with probability `chance` (0–100 %, seeded) pulses its connected blocks.
- **Prism** (`power.prism`): Angle, Rotate, Streams 1–4, Spread (SIMULATION-0006); exit lines while its panel is open.
- SPEC-SIMULATION-POWER-AND-PARTICLES: new R2c (Counter), R2d (Chance), R5d (prism particles), R7a (beams through
  Prisms).
- SPEC-CONNECTIONS-PROXIMITY: Counter and Chance are power effects; Prism never connects by proximity.
- Designs: `tools/block-designer/proposed.json` (owner, 2026-11-13); copy each into its manifest unchanged.

## Acceptance
- `pnpm test:engine`: Euclidean patterns (E(3,8) = x..x..x.), Counter pulses on active steps only, one step per beam
  arrival, reset (world on, Stage power, Reset); Chance rolls and pulses; prism fan angles, remaining range, 8-prism path
  limit, pool-full drop; each cites its R number.
- `pnpm bd render --check`: unchanged existing goldens; new `counter`, `chance`, `prism-split` goldens identical across
  release/dev, WASM and worklet.
- `pnpm test:new-blocks --only counter-panel,chance-fires,prism-splits-beam`: the menu has them, a Chance plays the
  Tone beside it at 100 % and never at 0 %, the Counter's panel shows the
  pattern and where it is and Reset sends it to step 1, a Prism splits a beam and draws its exit lines.

## Risks and unknowns
- Beam fan-out cost with many prisms: bounded at 64 beams per laser and 8 Prisms per path (`config.hpp`); not yet
  measured with `pnpm bd perf`.
- A Prism has Rotate but no tempo-synced Turn (the Laser has both); add it if wanted.

## Owner review 1 (2026-11-14)
- Laser and Prism Rotate stick at 0: a drag into the middle stops there; staying near it for half a second lets small values through.
