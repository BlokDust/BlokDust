---
id: CHG-0014
title: Compressor block and emitter Offset
status: proposed
date: 2026-11-13
specs: [SPEC-AUDIO-V1-PARITY, SPEC-SIMULATION-POWER-AND-PARTICLES, SPEC-PATCH-FORMAT-V2]
adrs: [SCOPE-0005, AUDIO-0001]
---
# CHG-0014: Compressor block and emitter Offset

## Why
Users asked for a compressor. The owner also wants to nudge emitters off the beat: today an emitter always fires on
its grid (or at once on power).

## What changes
- **Compressor** (`fx.compressor`, Effect menu): a port of Chromium's DynamicsCompressor (AUDIO-0001, as Tone.js used
  in v1-era code), with Threshold, Ratio, Knee, Attack, Release and Makeup. Its panel shows v1's dB meter
  (`OptionMeter`) for the input level, plus a threshold line and a gain-reduction bar. Designs: `tools/block-designer/proposed.json` (owner, 2026-11-13); copy each into its manifest unchanged.
- **Emitter Offset** (`offset`, 0–1 of the division when synced; 0–2 s when free): delays the first particle after
  power-on and shifts the synced grid. Laser `turnPhase` and Pulse offset follow the same rule.
  SPEC-SIMULATION-POWER-AND-PARTICLES R4 gains the offset; default 0 keeps today's timing.

## Out of scope
- Side-chain compression (needs a way to pick the key source).

## Acceptance
- `pnpm test:engine`: compressor unit tests (static curve, attack/release) and "R4 offset" cases.
- `pnpm bd render --check --configs release,dev`: existing goldens unchanged; new `compressor` and `emitter-offset`
  goldens. `pnpm bd wasm test` and `pnpm test:worklet` agree.
- `pnpm bd plugin test`: the new param is automatable.
- Owner check of the meter on staging.

## Risks and unknowns
- The meter needs a level tap per block; v1's meter read the master output.
