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
- **Gate** (`power.gate`, Power menu): connects to Power, Toggle, Pulse, Counter and Chance only (their catchment). Unpowered it
  absorbs particles and stops beams like Void; powered they pass. Param `invert` (off).
- SPEC-SIMULATION-POWER-AND-PARTICLES R5c (particles), R7c (beams).
- SPEC-CONNECTIONS-PROXIMITY R2d: the Gate connects to power effects only.
- Manifest kind `gate` (the Prism's kind is `path`).
- Look: a placeholder (a Void in a square frame), drawn faded while open, until the owner's block-designer design.

## Out of scope
- Gates powered by beams or particles reaching them.

## Acceptance
- `pnpm test:engine` (`test_gate.cpp`): closed absorbs and stops, open passes, `invert`, a beam cut and restored as a
  Toggle beside it turns on and off, a laser's hit on a Pulse opening it for the pulse, its connections; each cites
  its R number.
- `pnpm bd render --check`: existing goldens unchanged; new `gate` golden identical across release/dev, WASM and worklet.
- `pnpm test:new-blocks --only gate`: the menu has it; it stops a beam, and Invert opens it.

## Risks and unknowns
- The open Gate is drawn faded for now; its look, open and closed, comes with the design.
