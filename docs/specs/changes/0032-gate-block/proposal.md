---
id: CHG-0032
title: Gate block
status: proposed
date: 2026-11-17
specs: [SPEC-SIMULATION-POWER-AND-PARTICLES, SPEC-CONNECTIONS-PROXIMITY]
adrs: [SIMULATION-0011]
---
# CHG-0032: Gate block

## Why
Nothing in a patch can stop a particle or beam on cue, so patches cannot choose a path. A Gate is a Void that power
opens (SIMULATION-0011).

## What changes
- **Gate** (`power.gate`, Power menu, catchment 6): connects to Power, Toggle, Pulse and Counter only. Unpowered it
  absorbs particles and stops beams like Void; powered they pass. Param `invert` (off).
- SPEC-SIMULATION-POWER-AND-PARTICLES: a new R5 sub-requirement for particles and an R7a clause for beams.
- SPEC-CONNECTIONS-PROXIMITY: the Gate connects to power effects only.
- Design: owner, in `pnpm bd block-designer`, before building.

## Out of scope
- Gates powered by beams or particles reaching them.

## Acceptance
- `pnpm test:engine`: closed absorbs and stops, open passes, `invert`, a beam cut and restored as power changes, a
  Toggle struck by one laser opening another laser's path; each cites its R number.
- `pnpm bd render --check`: existing goldens unchanged; new `gate` golden identical across release/dev, WASM and worklet.
- `pnpm test:new-blocks --only gate`: the menu has it; a Toggle next to it opens a beam.

## Risks and unknowns
- Whether the open Gate should look different on the stage (e.g. drawn faded); decide with the design.
