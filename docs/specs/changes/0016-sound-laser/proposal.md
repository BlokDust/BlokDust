---
id: CHG-0016
title: Sound Laser
status: proposed
date: 2026-11-13
specs: [SPEC-SIMULATION-POWER-AND-PARTICLES, SPEC-AUDIO-V1-PARITY]
adrs: [SCOPE-0005, SIMULATION-0007]
---
# CHG-0016: Sound Laser

## Why
Let the microphone, audio input or any source trigger lasers, and through them particles: chain reactions from sound.

## What changes
- **Sound Laser** (`power.sound-laser`): listens to the sources connected to it; beam on while the band level is above
  (or, with Invert, below) Threshold, for at least Hold. Settings: Band (low/mid/high, or frequency + width), Threshold,
  Invert, Hold, Angle, Range (default short), Rotate. Its panel shows the same level meter + threshold line as the
  Compressor (CHG-0014).
- Engine: per-chain band level at the end of each audio block, read by the next tick (SIMULATION-0007).
- Designs: `tools/block-designer/proposed.json` (owner, 2026-11-13); copy each into its manifest unchanged.

## Out of scope
- Pitch detection (notes from audio).

## Acceptance
- `pnpm test:engine`: threshold, invert, hold, one-block latency, determinism with a recorded input.
- `pnpm bd render --check`: new `sound-laser` golden (a Tone pulsed by Pulse lights a Sound Laser that powers a second
  Tone).
- Owner check with a microphone on staging and Audio In in a DAW.

## Risks and unknowns
- Depends on CHG-0014's meter. Band filters must be cheap enough to run on every listened chain.
