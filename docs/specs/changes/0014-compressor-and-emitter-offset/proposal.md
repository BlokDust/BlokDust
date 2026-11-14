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
  in v1-era code), with Threshold, Ratio, Knee, Attack, Release and Makeup (±24 dB). Its panel's first row is v1's dB meter
  (`OptionMeter`'s look): the input level on −60…0 dB, the threshold as v1's peak marker, and the gain reduction as a
  thinner bar growing leftward from 0 dB. Up to 16 Compressors run at once (`kMaxCompressors`); more pass audio through.
  Live panel readouts reach the UI through a new `Engine::monitors` (web snapshots and the plugin's `bd_snapshot`). Designs: `tools/block-designer/proposed.json` (owner, 2026-11-13); copy each into its manifest unchanged.
- **Emitter Offset** (`offset`, 0–1 of its interval: the Division when synced, the Fire Rate when free): shifts the
  synced grid and delays the first particle after power-on. SPEC-SIMULATION-POWER-AND-PARTICLES R4a; default 0 keeps
  today's timing. The Offset row sits after Swing (synced) or Fire Rate (free).
- **New-block plumbing** used by every later change: manifests with `v1.type: null` join v1's menus and get their
  icons and forms from `web/src/v1ui/newBlocks.ts`; `pnpm bd block-designer scaffold` writes a manifest from a design;
  `pnpm test:new-blocks` is their browser test.

## Out of scope
- Side-chain compression (needs a way to pick the key source).
- A phase for the Laser and Pulse. A synced Laser's Angle already is its phase (where it points at beat 0), and a
  Pulse has no grid to shift: delaying a pulse is a different control. Say if either is wanted.

## Acceptance
- `pnpm test:engine`: compressor unit tests (static curve, attack/release) and "R4 offset" cases.
- `pnpm bd render --check --configs release,dev`: existing goldens unchanged; new `compressor` and `emitter-offset`
  goldens. `pnpm bd wasm test` and `pnpm test:worklet` agree.
- `pnpm test:new-blocks --only compressor-panel,emitter-offset-row`.
- `pnpm bd plugin test`: the built plugin renders the new goldens.
- Owner check of the meter on staging.

## Risks and unknowns
- Chromium's compressor adds its own make-up gain (as Web Audio does), so a default Compressor is louder on quiet
  material; Makeup can take it back off.

## Owner review 1 (2026-11-14)
- Compressor and Sound Laser: the Threshold row is gone; the Level meter's line is the threshold, dragged like a slider (full height, v1's grab diamond).
- The Particle Emitter's panel draws the way it fires (the Prism's dashed guide).
