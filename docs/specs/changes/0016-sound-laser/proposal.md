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
  (or, with Invert, below) Threshold, for at least Hold. Settings: Threshold, Band (All / Lows / Mids / Highs, a carousel), Beam on
  (When louder / When quieter), Hold, Angle, Range (default 150, short), Rotate. Its panel shows the same level meter + threshold line as the
  Compressor (CHG-0014).
- Engine: each Sound Laser sums the chains of its connected sources (after their effects), band-filters the sum and
  follows its peak per sample; each tick reads it (SIMULATION-0007, SPEC R7b). New kind `listener`: connects to audio
  sources only (SPEC-CONNECTIONS-PROXIMITY R2b).
- Designs: `tools/block-designer/proposed.json` (owner, 2026-11-13); copy each into its manifest unchanged.

## Out of scope
- Pitch detection (notes from audio).

## Acceptance
- `pnpm test:engine`: threshold, invert, hold, band, hearing after effects, determinism across buffer sizes.
- `pnpm test:new-blocks --only sound-laser`.
- `pnpm bd render --check`: new `sound-laser` golden (a Tone pulsed by Pulse lights a Sound Laser that powers a second
  Tone).
- Owner check with a microphone on staging and Audio In in a DAW.

## Risks and unknowns
- Up to 8 Sound Lasers listen at once; more stay dark.
- Not yet checked with a real microphone or DAW audio input: owner check.
